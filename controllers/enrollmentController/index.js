var async = require('async');
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

		var getJurisdictionEvents = function(savedRequest, requestCount, savedContact, callback){
			console.log("getJurisdictionEvents")
			var consent = req.body.subscribe;
			if(consent){
				Event.getJurisdictionEvents(savedRequest.get('operator_jurisdiction_id'))
				.then(function(eventCollection){
					callback(null, savedRequest, requestCount, savedContact, eventCollection);
				})
				.catch(function(error){
					callback(error);
				})
			}
			else{
				callback(null, savedRequest, requestCount, savedContact, null);
			}
		}

		var scheduleRequestEvents = function(savedRequest, requestCount, savedContact, eventCollection, callback){
			console.log("scheduleRequestEvents")
			var consent = req.body.subscribe;
			if(consent){
				RequestEvent.saveMany(savedRequest, eventCollection, savedContact)
				.then(function(){
					callback(null, savedRequest, requestCount, savedContact, null);
				})
				.catch(function(error){
					callback(error);
				});
			}
			else{
				callback(null, savedRequest, requestCount, savedContact, null);
			}
		}

		var buildMessage = function(err, savedRequest, requestCount, savedContact, callback){
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

		var sendFirstEmail = function(savedRequest, requestCount, savedContact, eventCollection, callback){
			var consent = req.body.subscribe;
			if(consent){
				var email = new Email();
				var address = savedContact.get('email_address');
				var operator_title = savedRequest.get("operator_title");
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
						template_name: "signup-en",
						template_content: []
					}
				)
				.then(function(result){
					callback(null, savedRequest, requestCount, savedContact, result);
				})
				.catch(function(e){
					callback(e);
				});
			}
			else{
				callback(null, savedRequest, requestCount, savedContact, result);
			}
		}

		async.waterfall([
			validateRequest,
			saveRequest,
			getRequestCount,
			subscribeUser,
			getJurisdictionEvents,
			scheduleRequestEvents,
			sendFirstEmail
		], buildMessage);
	};
	
	return this;
}
module.exports.enrollmentController = enrollmentController;