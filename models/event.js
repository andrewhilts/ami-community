var timestamper = require('../shared/timestamper');

var Event = function(bookshelf){
	var self = this;
	var EventModel = bookshelf.Model.extend({
		'tableName': 'events',
		'idAttribute': 'event_id'
	});
	var EventCollection = bookshelf.Collection.extend({
		'model': EventModel
	});
	this.save = function(name, description, jurisdiction_id, days_to_reminder){
		var event = new EventModel({
			'name': name, 
			'description': description, 
			'jurisdiction_id': jurisdiction_id,
			'days_to_reminder': days_to_reminder
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