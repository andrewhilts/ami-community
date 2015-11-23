var timestamper = require('../shared/timestamper');

var Event = function(bookshelf){
	var self = this;
	var EventModel = bookshelf.Model.extend({
		'tableName': 'events',
		'idAttribute': 'event_id'
	});
	self.EventModel = EventModel;
	var EventCollection = bookshelf.Collection.extend({
		'model': EventModel
	});
	this.save = function(name, description, jurisdiction_id, days_to_reminder, email_template, email_subject){
		var event = new EventModel({
			'name': name, 
			'description': description, 
			'jurisdiction_id': jurisdiction_id,
			'days_to_reminder': days_to_reminder,
			"email_template": email_template,
			"email_subject": email_subject
		})
		.save();
		return event;
	}
	this.getJurisdictionEvents = function(jurisdiction_id){
		var events = new EventModel()
		.query({where: {"jurisdiction_id": jurisdiction_id}})
		.fetchAll()
		return events;
	}
	return this;
}
module.exports.EventController = Event;