var async = require('async');
var emailVerificationController = require('../emailVerificationController').emailVerificationController;
var policy = require('../../conf/policy.conf').policy;
var EmailTemplate = require('email-templates').EmailTemplate;
var Q = require('q');
var fs = require('fs');

/*
This controller enrolls a user to receive notifications.

When someone opts into receiving AMI emails, a "Request Contact" record is created, associating an email address with a request. 


*/
var enrollmentController = function(Request, Subscription, Event, RequestEvent, Email){
	/*  This method validates a users request, saves the request in the system, gets the total number of requests to that operator, provisionally subscribes the user to emails if they opted in, and sends a verification email to the address if they opted in.
	*/
	this.submit = function(req, res) {
		// Validates the request to make sure that the same email address is not used for a reqyest to a company more than once every 60 days, if the user consented.
		var validateRequest = function(callback){
			var consent = req.body.subscribe;
			if(consent){
				Request.validateRequest(
					req.body.data.operator.id,
					req.body.email.address
				)
				.then(function(collection){
					if(collection.length){
						callback({
							"statusCode": "R2", 
							"message": "Sorry, you've already created a request to " + req.body.data.operator.title + " recently.",
							"data": {
								"operator": req.body.data.operator.title
							}
						});
					}
					else{
						callback(null)
					}
				})
				.catch(function(err){
					console.log(err);
					callback({
						"statusCode": "R3", 
						"message": "System Error. Can't save request."
					});
				})
			}
			else{
				callback(null);
			}
		}

		// Saves a new request record
		var saveRequest = function(callback){
			console.log("saveRequest")
			Request.save(
				req.body.data.date, 
				req.body.data.operator.title, 
				req.body.data.operator.id, 
				req.body.data.jurisdiction.title, 
				req.body.data.jurisdiction.id,
				req.body.language
			)
			.then(function(savedRequest){
				callback(null, savedRequest)
			})
			.catch(function(err){
				console.log(err);
				callback({
					"statusCode": "R3", 
					"message": "System Error. Can't save request."
				});
			})
		}

		// Gets the total number of requests in the requester's jurisdiction for the data operator they requested from.
		var getRequestCount = function(savedRequest, callback){
			console.log("getRequestCount")
			Request.getRequestCountForOperator(
				savedRequest.get('operator_id'), 
				savedRequest.get('operator_jurisdiction_id')
			).
			then(function(requestCount){
				callback(null, savedRequest, requestCount);
			})
			.catch(function(error){
				console.log(error);
				callback(null, savedRequest, "?");
			});
		}

		// Provisionally subscribes a consenting user to receive email notifications (pending email verification)
		var subscribeUser = function(savedRequest, requestCount, callback){
			console.log("subscribeUser")
			var consent = req.body.subscribe;
			var email = req.body.email.address;
			if(consent){
				Subscription.subscribe(consent, email, savedRequest.get('request_id'))
				.then(function(savedContact){
					callback(null, savedRequest, requestCount, savedContact);
				})
				.catch(function(error){
					callback(error);
				});
			}
			else{
				callback(null, savedRequest, requestCount, null);
			}
		}

		// Builds a JSON response message to return to the AMI Frontend informing the user of the status of their request.
		var buildMessage = function(err, savedRequest, requestCount, savedContact, sendResult){
			var msg;
			if(err){
				msg = err;
			}
			else{
				message = "Thank you. There are now " + requestCount + " requests created for " + savedRequest.get('operator_title') + " in " + savedRequest.get('operator_jurisdiction') + "."
				if(savedContact){
					message += " You will receive an email shortly explaining what to expect."	
				}
				data = {
					count: requestCount,
					operator: savedRequest.get('operator_title'),
					jurisdiction: savedRequest.get('operator_jurisdiction')
				}
				msg = {
					"statusCode": "R1",
					"message": message,
					"data": data
				}
			}
			res.json({
				title: msg
			});
		}

		// Create an email verification request for the user if the contact was successfully saved. See the documentation for emailVerificationController for more information.
		var verifyEmail = function(savedRequest, requestCount, savedContact, callback){
			console.log("verifyEmail");
			if(savedContact){
				var verifier = new emailVerificationController(Subscription);
				verifier.createVerificationRequest(savedRequest, savedContact)
				.then(function(result){
					callback(null, savedRequest, requestCount, savedContact, result);
				})
				.catch(function(e){
					callback(e);
				})
			}
			else{
				callback(null, savedRequest, requestCount);
			}
		}

		// Method process execution
		async.waterfall([
			validateRequest,
			saveRequest,
			getRequestCount,
			subscribeUser,
			verifyEmail
		], buildMessage);
	};

	/* This method checks a request containing an email verification token. If the token is valid, it subscribes the email address associated with the token to receive notifications, schedules certain emails to be sent based on jurisdiction events associated with the request's jurisdiction, and sends a confirmation email to the address on file.
    */
	this.verifyAndEnroll = function(req, res){		
		// Verifies the received token, returning the associated request contact if successful.
		var handleToken = function(callback){						
			var token = req.query.token;
			var verifier = new emailVerificationController(Subscription);
			verifier.handleTokenResponse(token)
			.then(function(requestContact){
				console.log("verification finished");
				callback(null, requestContact);
			})
			.catch(function(e){
				console.log("verification error");
				callback(e);
			})
		}

		// Get the request associated with the request contact
		var getRequestByContact = function(requestContact, callback){
			console.log("Getting request by contact", requestContact.get('request_id'));
			Request.getById(requestContact.get('request_id'))
			.then(function(request){
				if(request){
					console.log("request", request);
					callback(null, request, requestContact);
				}
				else{
					callback({
						"statusCode": "V7", 
						"message": "No AMI requests found for that email address"
					});
				}
			})
			.catch(function(e){
				callback({
					"statusCode": "D1", 
					"message": "Database Error."
				});
			})
		}

		// Get the jurisdiction events associated with the request's jurisdiction
		var getJurisdictionEvents = function(request, requestContact, callback){
			console.log("getJurisdictionEvents", request.get('operator_jurisdiction_id'))
			Event.getJurisdictionEvents(request.get('operator_jurisdiction_id'))
			.then(function(eventCollection){
				callback(null, request, requestContact, eventCollection);
			})
			.catch(function(error){
				callback({
					"statusCode": "D1", 
					"message": "Database Error."
				});
			})
		}

		// Schedule emails to be sent according to when the jurisdiction events are supposed to happen after a request is submitted. (eg: send a reminder 30 days after a request)
		var scheduleRequestEvents = function(request, requestContact, eventCollection, callback){
			console.log("scheduleRequestEvents")
			RequestEvent.saveMany(request, eventCollection, requestContact)
			.then(function(){
				callback(null, request, requestContact);
			})
			.catch(function(error){
				console.log(error);
				callback({
					"statusCode": "D1", 
					"message": "Database Error."
				});
			});
		}

		// Send a confirmation email to the user notifying them that they have been subscribed to receive emails.
		var sendConfirmationEmail = function(request, requestContact, callback){
			var language = request.get('language');
			var email = new Email(language);
			var address = requestContact.get('email_address');
			var operator_title = request.get("operator_title");

			var unsubscribeURL = email.makeUnsubLink(address);

			var jurisdiction = request.get('operator_jurisdiction_id');
			var subject, amiLogoPath;

			var templateDir = "emailTemplates/confirmation-"+language+"-"+jurisdiction;
			if(!fs.existsSync(templateDir)){
				templateDir = "emailTemplates/confirmation-default";
			}
			var confirmationTemplate = new EmailTemplate(templateDir);


			if(typeof policy.languages !== "undefined" && typeof policy.languages[language] !== "undefined" && typeof policy.languages[language].logoFileName !== "undefined"){
				amiLogoPath = policy.AMIFrontEnd.baseURL + policy.AMIFrontEnd.paths.logo + "/" + policy.languages[language].logoFileName;
			}
			else{
				amiLogoPath = policy.AMIFrontEnd.baseURL + policy.AMIFrontEnd.paths.logo + "/AMICAFullLogoWhiteBackground.png";
			}
			if(typeof policy.languages !== "undefined" && typeof policy.languages[language] !== "undefined" && typeof policy.languages[language].confirmSubjectLine !== "undefined"){
				subject = policy.languages[language].confirmSubjectLine;
			}
			else{
				subject = "Reqyest confirmed: Access My Info";
			}

			var params = {
				operator_title: operator_title,
				unsubscribeURL: unsubscribeURL,
				amiLogoPath: amiLogoPath
			}
			return new Q.Promise(function(resolve,reject){
				confirmationTemplate.render(params, function(err, results){
					if(err){
						console.log(err);
						reject(err);
					}

					email.send({
						to:address, 
						subject: subject,
						text: results.text,
						html: results.html
					})
					.then(function(result){
						resolve(result);
					})
					.catch(function(err){
						reject(err);
					})
				});
			})
			.then(function(result){
				callback(null, request, requestContact, result);
			})
			.catch(function(e){
				callback({
					"statusCode": "M1", 
					"message": "Unable to sent email."
				});
			});
		}

		// Execute process flow
		if(typeof req.query.token !== "undefined"){
			async.waterfall([
				handleToken,
				getRequestByContact,
				getJurisdictionEvents,
				scheduleRequestEvents,
				sendConfirmationEmail
			], function(err, request, requestContact, result){
				if(err){
					msg = err
				}
				else{
					msg =	{
						"statusCode": "V1", 
						"message": "The email address " + requestContact.get('email_address')+ " has been verified, and is now subscribed to AMI notifications",
						"data": {
							"email_address": requestContact.get('email_address')
						}
					}
				}
				res.json({
					message: msg
				});
			});
		}
		else{
			res.json({
				message: {
					"statusCode": "V5", 
					"message": "No token provided."
				}
			});
		}
	}
	
	return this;
}
module.exports.enrollmentController = enrollmentController;