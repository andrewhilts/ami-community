var async = require('async');
var emailVerificationController = require('../emailVerificationController').emailVerificationController;

var enrollmentController = function(Request, Subscription, Event, RequestEvent, Email){
	this.getForm = function(req, res) {
		res.json({
			title: 'Enrollment!'
		});
	};
	this.submit = function(req, res) {
		var validateRequest = function(callback){
			Request.validateRequest(
				req.body.data.operator.id,
				req.body.email.address
			)
			.then(function(collection){
				if(collection.length){
					callback("Sorry, you've already created a request to " + req.body.data.operator.title + " recently.");
				}
				else{
					callback(null)
				}
			})
			.catch(function(err){
				console.log(err);
				callback("System Error. Can't save request.");
			})
		}

		var saveRequest = function(callback){
			console.log("saveRequest")
			Request.save(
				req.body.data.date, 
				req.body.data.operator.title, 
				req.body.data.operator.id, 
				req.body.data.jurisdiction.title, 
				req.body.data.jurisdiction.id
			)
			.then(function(savedRequest){
				callback(null, savedRequest)
			})
			.catch(function(err){
				console.log(err);
				callback("System Error. Can't save request.");
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
				callback(error);
			});
		}

		var subscribeUser = function(savedRequest, requestCount, callback){
			console.log("subscribeUser")
			var consent = req.body.subscribe;
			var email = req.body.email.address;
			Subscription.subscribe(consent, email, savedRequest.get('request_id'))
			.then(function(savedContact){
				callback(null, savedRequest, requestCount, savedContact);
			})
			.catch(function(error){
				callback(error);
			});
		}

		

		var buildMessage = function(err, savedRequest, requestCount, savedContact, sendResult){
			var msg;
			if(err){
				msg = err;
			}
			else{
				msg = "Thank you. There are now " + requestCount + " requests created for " + savedRequest.get('operator_title') + " in " + savedRequest.get('operator_jurisdiction') + "."
				if(savedContact){
					msg += " You will receive an email shortly explaining what to expect."	
				}
			}
			res.json({
				title: msg
			});
		}

		var verifyEmail = function(savedRequest, requestCount, savedContact, callback){
			console.log("verifyEmail");
			var verifier = new emailVerificationController(Subscription);
			verifier.createVerificationRequest(savedRequest, savedContact)
			.then(function(result){
				callback(null, savedRequest, requestCount, savedContact, result);
			})
			.catch(function(e){
				callback(e);
			})
		}

		async.waterfall([
			validateRequest,
			saveRequest,
			getRequestCount,
			subscribeUser,
			verifyEmail
		], buildMessage);
	};

	this.verify = function(req, res){
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
					callback("No request by that ID");
				}
			})
			.catch(function(e){
				callback(e);
			})
		}

		var getJurisdictionEvents = function(request, requestContact, callback){
			console.log("getJurisdictionEvents", request.get('operator_jurisdiction_id'))
			Event.getJurisdictionEvents(request.get('operator_jurisdiction_id'))
			.then(function(eventCollection){
				callback(null, request, requestContact, eventCollection);
			})
			.catch(function(error){
				callback(error);
			})
		}

		var scheduleRequestEvents = function(request, requestContact, eventCollection, callback){
			console.log("scheduleRequestEvents")
			RequestEvent.saveMany(request, eventCollection, requestContact)
			.then(function(){
				callback(null, request, requestContact);
			})
			.catch(function(error){
				callback(error);
			});
		}

		var sendConfirmationEmail = function(request, requestContact, callback){
			var email = new Email();
			var address = requestContact.get('email_address');
			var operator_title = request.get("operator_title");
			email.send(
				{
					"to": [{email: address}],
					"subject": "Thanks for using Access My Info",
					"merge_vars": [{
			            "rcpt": address,
			            "vars": [{
		                    "name": "operator_title",
		                    "content": operator_title
			            }]
			        }]
				},
				{
					template_name: "email-confirmation-en",
					template_content: []
				}
			)
			.then(function(result){
				callback(null, request, requestContact, result);
			})
			.catch(function(e){
				callback(e);
			});
		}

		if(typeof req.query.token !== "undefined"){
			async.waterfall([
				handleToken,
				getRequestByContact,
				getJurisdictionEvents,
				scheduleRequestEvents,
				sendConfirmationEmail
			], function(err, result){
				if(err){
					msg = err;
				}
				else{
					msg = "Email verified, and subscribed to feedback notifications";
				}
				res.json({
					message: msg
				});
			});
		}
		else{
			res.json({
				message: 'Error: No token provided'
			});
		}
	}
	
	return this;
}
module.exports.enrollmentController = enrollmentController;