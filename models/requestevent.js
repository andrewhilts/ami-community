var timestamper = require('../shared/timestamper');
var moment = require('moment');
var Q = require('q');
var async = require('async');

var RequestEvent = function(bookshelf){
	var self = this;
	var RequestEventModel = bookshelf.Model.extend({
		'tableName': 'request_events',
		'idAttribute': 'request_event_id'
	});
	self.RequestEventModel = RequestEventModel;
	var RequestEventCollection = bookshelf.Collection.extend({
		'model': self.RequestEventModel
	});
	self.RequestEventCollection = RequestEventCollection;
	this.save = function(request, eventModel, requestContact){
		var emailScheduleDate = moment().add(parseInt(eventModel.get('days_to_reminder')), 'days');
		return requestEvent = new RequestEventModel({
			request_id: request.get('request_id'),
			event_id: eventModel.get('event_id'),
			request_contact_id: requestContact.get('request_contact_id'),
			email_sent: false,
			email_schedule_date: emailScheduleDate.format('YYYY-MM-DD')
		})
		.save();
	}
	this.saveMany = function(request, events, requestContact){
		var eventList = [];
		for(var i=0; i < events.models.length; i++){
			eventList.push(events.at(i));
		}
		
		return new Q.Promise(function(resolve,reject){
			async.each(eventList, function(eventModel, callback){
				self.save(request, eventModel, requestContact)
				.then(function(savedEvent){
					callback();
				})
				.catch(function(error){
					console.log(error);
					callback({
						"status_code": "D1",
						"message": "Database Error"
					})
				})
			}, function(error){
				if(error){
					reject(error);
				}
				else{
					resolve();
				}
			});
		});
	}
	return this;
}
module.exports.RequestEventController = RequestEvent;