var timestamper = require('../shared/timestamper');

var Request = function(bookshelf){
	var self = this;
	var RequestModel = bookshelf.Model.extend({
		'tableName': 'requests',
		'idAttribute': 'request_id'
	});
	var RequestCollection = bookshelf.Collection.extend({
		'model': RequestModel
	});
	this.save = function(request_date, operator_title, operator_id, jurisdiction, jurisdiction_id){
		var request = new RequestModel({
			'dateadded': timestamper.getTimestampPSQL(),
			'request_date': timestamper.formatForPSQL(request_date),
			'operator_title': operator_title, 
			'operator_id': operator_id, 
			'operator_jurisdiction': jurisdiction, 
			'operator_jurisdiction_id': jurisdiction_id
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
	return this;
}
module.exports = Request;