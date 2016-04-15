var timestamper = require('../shared/timestamper');
var moment = require('moment');

var Request = function(bookshelf){
	var self = this;
	var RequestModel = bookshelf.Model.extend({
		'tableName': 'requests',
		'idAttribute': 'request_id'
	});
	var RequestCollection = bookshelf.Collection.extend({
		'model': RequestModel
	});
	var RequestContact = bookshelf.Model.extend({
		'tableName': 'request_contacts',
		'idAttribute': 'request_contact_id'
	});
	this.RequestModel = RequestModel;
	this.RequestContact = RequestContact;
	this.validateRequest = function(operator_id, email_address){
		// Get history of requests for email
		var validationPeriodStart = moment().subtract(60, 'days');

		return new RequestModel()
		.query(function(qb){
			qb.innerJoin('request_contacts', 'requests.request_id', 'request_contacts.request_id');
			qb.where('requests.operator_id', operator_id);
			qb.where('request_contacts.email_address', email_address);
			qb.where('requests.request_date', '>=', validationPeriodStart.format('YYYY-MM-DD'));
		})
		.fetchAll();
	}
	this.save = function(request_date, operator_title, operator_id, jurisdiction, jurisdiction_id, language){
		var request = new RequestModel({
			'dateadded': timestamper.getTimestampPSQL(),
			'request_date': timestamper.formatForPSQL(request_date),
			'operator_title': operator_title, 
			'operator_id': operator_id, 
			'operator_jurisdiction': jurisdiction, 
			'operator_jurisdiction_id': jurisdiction_id,
			'language': language
		})
		.save();
		return request;
	}
	this.getRequestCountForOperator = function(operator_id, jurisdiction_id){
		var requests = new RequestModel();
		var promise = requests.where({
			'operator_id': operator_id,
			'operator_jurisdiction_id': jurisdiction_id
		})
		.count('*');
		return promise;
	}
	this.getById = function(request_id){
		return new RequestModel().where("request_id", request_id).fetch();
	}
	return this;
}
module.exports.RequestController = Request;