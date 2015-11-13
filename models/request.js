var timestamper = require('../shared/timestamper');

var Request = function(bookshelf){
	var self = this;
	var RequestModel = bookshelf.Model.extend({
		'tableName': 'requests',
		'idAttribute': 'request_id'
	});
	this.save = function(request_date, operator_title, operator_id, jurisdiction, jurisdiction_id, callback){
		var request = new RequestModel({
			'dateadded': timestamper.getTimestampPSQL(),
			'request_date': timestamper.formatForPSQL(request_date),
			'operator_title': operator_title, 
			'operator_id': operator_id, 
			'operator_jurisdiction': jurisdiction, 
			'operator_jurisdiction_id': jurisdiction_id
		})
		.save()
		.then(function(requestModel){
			if(requestModel){
				callback(null, requestModel);
			}
			else{
				callback(new Error("unable to save request"));
			}
		})
		.catch(function(err){
			callback(err);
		})
	}
	return this;
}
module.exports = Request;