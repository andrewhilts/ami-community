var async = require('async');
var Q = require('q');
var moment = require('moment');
var _ = require('lodash');
var policy = require('../../conf/policy.conf').policy;
var EmailTemplate = require('email-templates').EmailTemplate;

var EventNotificationController = function(Event, Request, RequestEvent){
	var self = this;

	self.getTodaysDate = function(){
		return moment();
	}

	self.getUnsentRequestEventsByDate = function(date){
		console.log('getting unsent request events');	
		return new RequestEvent.RequestEventModel()
		.where('email_schedule_date', '<=', date.format('YYYY-MM-DD'))
		.where('email_sent', false)
		.fetchAll();
	}

	self.sendEventEmails = function(eventModel, requestEvents, requests, requestContacts){
		console.log("Starting to send individual emails");
		async.each(requestEvents.models, function(requestEvent, callback){
			var requestContact = requestContacts.findWhere({"request_id": requestEvent.get('request_id')});
			var request = requests.findWhere({"request_id": requestEvent.get('request_id')});
			self.sendEventEmail(eventModel, request, requestContact)
			.then(function(request, requestContact, result){
				console.log(result);
				callback(result);
				//callback(null, request, requestContact, result)
			})
			.catch(function(e){
				callback({
					"statusCode": "M1", 
					"message": "Unable to sent email."
				});
			});
		}, function(err){
			return new Q.Promise(function(resolve,reject){
				console.log(err);
				callback(err);
			});
		});
	}

	self.sendEventEmail = function(eventModel, request, requestContact){
		var email = new Email();
		var address = requestContact.get('email_address');
		var operator_title = request.get("operator_title");
		var request_date = request.get("request_date");
		var templatePrefix = eventModel.get("email_template");
		var unsubscribeURL = email.makeUnsubLink(address);

		var language = request.get('language');
		var jurisdiction = request.get('operator_jurisdiction_id');
		var subject; 
		var amiLogoPath = policy.AMIFrontEnd.baseURL + policy.AMIFrontEnd.paths.logo;

		// Change based on event type
		var templateDir = "../../emailTemplates/"+templatePrefix+"-"+language+"-"+jurisdiction;
		try{
		var confirmationTemplate = new EmailTemplate(templateDir);
		}
		catch(e){
			callback(e);
		}

		switch(language){
			case "en":
			subject = "A message from Access My Info Hong Kong"
			break;
			case "zh":
			subject = "A message from Access My Info Hong Kong"
			break;
		}
		var params = {
			operator_title: operator_title,
			request_date: request_date,
			unsubscribeURL: unsubscribeURL,
			amiLogoPath: amiLogoPath
		}
		return new Q.Promise(function(resolve,reject){
			confirmationTemplate.render(params, function(err, results){
				if(err){
					console.log(err);
					reject(err);
				}
				console.log(results.html);
				resolve();
				// email.send({
				// 	to:address, 
				// 	subject: subject,
				// 	text: results.text,
				// 	html: results.html
				// })
				// .then(function(result){
					// resolve(result);
				// })
				// .catch(function(err){
				// 	reject(err);
				// })
			});
		});
	}

	self.getRequestDetails = function(requestEvents){
		var requestIds = requestEvents.pluck('request_id');
		return new Request.RequestModel()
		.query(function(qb){
			qb.whereIn('request_id', requestIds);
		})
		.fetchAll();
	}

	self.getRequestContactDetails = function(requestEvents){
		var requestIds = requestEvents.pluck('request_id');
		return new Request.RequestContact()
		.query(function(qb){
			qb.whereIn('request_id', requestIds);
		})
		.fetchAll();
	}

	self.getEventDetails = function(requestEvents){
		var eventId = requestEvents.first().get('event_id');
		return new Event.EventModel({'event_id': eventId})
		.fetch();
	}

	self.filterRequestEventsByType = function(events){
		console.log("filtering events by type");
		return new Q.Promise(function(resolve,reject){
			groupedEvents = events.groupBy("event_id");
			if(Object.keys(groupedEvents).length){
				resolve(groupedEvents);
			}
			else{
				reject("No events");
			}
		});
	}

	self.sendEmails = function(eventModel, emailParams){
		var email = new Email();
		return email.send(
			{
				"to": emailParams.to,
				"subject": eventModel.get('email_subject'),
				"merge_vars": emailParams.merge_vars
			},
			{
				template_name: eventModel.get('email_template'),
				template_content: []
			}
		);
	}

	self.markEventsAsSent = function(requestEvents, results){
		requestEvents.models.forEach(function(model){
			model.set({'email_sent': true});
			model.unset('request');
			model.unset('requestContact');
		});
		return requestEvents.invokeThen('save', null);
	}

	self.sendRequestEventNotificationType = function(requestEvents){
		console.log("starting to send request event for type");
		return new Q.Promise(function(resolve,reject){
			async.waterfall([
				function(callback){
					self.getEventDetails(requestEvents)
					.then(function(eventModel){
						if(eventModel){
							callback(null, eventModel, requestEvents)
						}
						else{
							callback("no event details found");
						}
					})
					.catch(function(e){
						console.log("err", e);
						callback(e);
					})
				},
				function(eventModel, requestEvents, callback){
					console.log("getting request details");
					self.getRequestDetails(requestEvents)
					.then(function(requests){
						if(requests.models.length){
							callback(null, eventModel, requestEvents, requests)
						}
						else{
							callback("No requests found to be associated with these request events");
						}
					})
					.catch(function(e){
						console.log("err", e);
						callback(e);
					})
				},
				function(eventModel, requestEvents, requests, callback){
					self.getRequestContactDetails(requestEvents)
					.then(function(requestContacts){
						if(requestContacts.models.length){
							callback(null, eventModel, requestEvents, requests, requestContacts)
						}
						else{
							callback("No request contacts found to be associated with these request events.");
						}
					})
					.catch(function(e){
						console.log("err", e);
						callback(e);
					})
				},
				function(eventModel, requestEvents, requests, requestContacts, callback){
					self.sendEventEmails(eventModel, requestEvents, requests, requestContacts)
 					.then(function(result){
						callback(null, eventModel, requestEvents, requests, requestContacts, emailParams, result)
					})
					.catch(function(e){
						console.log("err", e);
						callback(e);
					})
				}
				//,
				// function(eventModel, requestEvents, requests, requestContacts, emailParams, result, callback){
				// 	self.markEventsAsSent(requestEvents)
				// 	.then(function(result){
				// 		callback(null, result)
				// 	})
				// 	.catch(function(e){
				// 		console.log("err", e);
				// 		callback(e);
				// 	})
				// }
			], function(err, result){
				if(err){
					reject(err);
				}
				else{
					resolve(result);
				}
			})
		});
	}

	self.notify = function(){
		console.log("Notifying");
		return new Q.Promise(function(resolve,reject){
			async.waterfall([
				function(callback){
					date = self.getTodaysDate();
					if(date){
						callback(null, date);
					}
					else{
						callback("Can't get today's date");
					}
				},
				function(date, callback){
					console.log("got date ", date.format('YYYY-MM-DD'));
					self.getUnsentRequestEventsByDate(date)
					.then(function(events){
						if(events){
							callback(null, events);
						}
						else{
							callback("No events found");
						}
					})
					.catch(function(err){
						callback(err);
					})
				},
				function(events, callback){
					self.filterRequestEventsByType(events)
					.then(function(eventTypes){
						callback(null, eventTypes);
					})
					.catch(function(err){
						callback(err);
					})
				},
				function(eventTypes, callback){
					async.each(eventTypes, function(eventType, subCallback){
						self.sendRequestEventNotificationType(new bookshelf.Collection(eventType))
						.then(function(result){
							subCallback(null, result)
						})
						.catch(function(err){
							subCallback(err);
						})
					}, function(err, result){
						if(err){
							callback(err);
						}
						else{
							callback(null);
						}
					});
				}
			], function(err, result){
				if(err){
					reject(err);
				}
				else{
					resolve(result);
				}
			});
		});
	}
	return this;
}
var bookshelf = require('../../database/db').db;
var RequestEvent = require('../../models/requestevent.js').RequestEventController(bookshelf);
var Request = require('../../models/request.js').RequestController(bookshelf);
var Event = require('../../models/event.js').EventController(bookshelf);
var notifier = new EventNotificationController(Event, Request, RequestEvent);
var Email = require('../../models/email').EmailModel;

var run = function(){
notifier.notify()
.then(function(result){
	console.log("done");
})
.catch(function(e){
	console.log(e);
})
.finally(function(){
	bookshelf.knex.destroy();
})
};
run();

