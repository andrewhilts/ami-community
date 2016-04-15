var async = require('async');
var emailVerificationController = require('../emailVerificationController').emailVerificationController;

var enrollmentController = function(Request, Subscription, Event, RequestEvent, Email){
	this.submit = function(req, res) {
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

		async.waterfall([
			validateRequest,
			saveRequest,
			getRequestCount,
			subscribeUser,
			verifyEmail
		], buildMessage);
	};

	this.verifyAndEnroll = function(req, res){
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

		var scheduleRequestEvents = function(request, requestContact, eventCollection, callback){
			console.log("scheduleRequestEvents")
			RequestEvent.saveMany(request, eventCollection, requestContact)
			.then(function(){
				callback(null, request, requestContact);
			})
			.catch(function(error){
				callback({
					"statusCode": "D1", 
					"message": "Database Error."
				});
			});
		}

		var sendConfirmationEmail = function(request, requestContact, callback){
			var email = new Email();
			var address = requestContact.get('email_address');
			var operator_title = request.get("operator_title");

			var unsubscribeURL = policy.unsubLink + "?email_address="+address;

			var language = request.get('language');
			var jurisdiction = request.get('operator_jurisdiction_id');
			var subject; 

			var templateDir = "emailTemplates/confirmation-"+language+"-"+jurisdiction;
			var confirmationTemplate = new EmailTemplate(templateDir);

			switch(language){
				case "en":
				subject = "Request confirmed: Access My Info Hong Kong"
				break;
				case "zh":
				subject = "Request confirmed: Access My Info Hong Kong"
				break;
			}
			var params = {
				operator_title: operator_title,
				unsubscribeURL: unsubscribeURL
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