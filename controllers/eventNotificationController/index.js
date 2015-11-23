var async = require('async');
var Q = require('q');
var moment = require('moment');
var _ = require('lodash');

var EventNotificationController = function(Event, Request, RequestEvent){
	var self = this;

	self.getTodaysDate = function(){
		return moment();
	}

	self.getUnsentRequestEventsByDate = function(date){
		return new RequestEvent.RequestEventModel()
		.where('email_schedule_date', '<=', date.format('YYYY-MM-DD'))
		.where('email_sent', false)
		.fetchAll();
	}

	self.buildEventEmailParams = function(eventModel, requestEvents, requests, requestContacts){
		return new Q.Promise(function(resolve,reject){
			var params = {
				"to": [],
				"merge_vars": []
			};
			// Merge requst events with associated request
			requestEvents.models.forEach(function(model){
				var request_id = model.get('request_id')
				var request = requests.get(request_id);
				var requestContact = requestContacts.where({'request_id': request_id})[0];
				model.set({
					'request': request,
					'requestContact': requestContact
				});
			})

			requestEvents.models.forEach(function(model){
				var dateString =  moment(model.get('request').get('request_date')).format('MMMM Do YYYY');
				params.to.push({
					email: model.get('requestContact').get('email_address')
				});
				params.merge_vars.push({
					rcpt: model.get('requestContact').get('email_address'),
					vars: [
						{
							name: "operator_title",
							content: model.get('request').get('operator_title')
						},
						{
							name: "request_date",
							content: dateString
						}
					]
				});
			});
			if(params.to.length){
				resolve(params);
			}
			else{
				reject("No email addresses");
			}
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
					self.buildEventEmailParams(eventModel, requestEvents, requests, requestContacts)
					.then(function(emailParams){
						callback(null, eventModel, requestEvents, requests, requestContacts, emailParams)
					})
					.catch(function(e){
						console.log("err", e);
						callback(e);
					})
				},
				function(eventModel, requestEvents, requests, requestContacts, emailParams, callback){
					self.sendEmails(eventModel, emailParams)
					.then(function(result){
						callback(null, eventModel, requestEvents, requests, requestContacts, emailParams, result)
					})
					.catch(function(e){
						console.log("err", e);
						callback(e);
					})
				},
				function(eventModel, requestEvents, requests, requestContacts, emailParams, result, callback){
					self.markEventsAsSent(requestEvents)
					.then(function(result){
						callback(null, result)
					})
					.catch(function(e){
						console.log("err", e);
						callback(e);
					})
				}
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

