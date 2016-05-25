var async = require('async');
var Q = require('q');

var statsController = function(Request){
	var self = this;
	self.getTotal = function(jurisdiction_id){
		return new Request.RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
		})
		.count();
	}
	self.getVerified = function(jurisdiction_id){
		return new Request.RequestCollection()
		.query(function(qb){
			qb.innerJoin('request_contacts', 'requests.request_id', 'request_contacts.request_id');
			qb.where('operator_jurisdiction_id', jurisdiction_id);
		})
		.count();
	}
	self.getByCompany = function(jurisdiction_id){
		return new Request.RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
			qb.groupBy('operator_id');
		})
		.count();
	}
	self.getByDate = function(jurisdiction_id){
		return new Request.RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
			qb.groupBy('operator_id');
		})
		.count();
	}
	this.methodAllocator = function(req, res){
		var method = req.params.method;
		var jurisdiction = parseInt(req.params.jurisdiction);
		if(isNaN(jurisdiction)){
			throw new Error("jurisdiction not a number");
		}
		var jsonPromise;
		if(typeof method == "undefined" || typeof jurisdiction == "undefined"){
			throw new Error("Missing parameters");
		}
		switch(method){
			case "getTotal":
				jsonPromise = self.getTotal(jurisdiction);
			break;
			case "getVerified":
				jsonPromise = self.getVerified(jurisdiction);
			break;
			case "getByCompany":
				jsonPromise = self.getByCompany(jurisdiction);
			break;
			case "getByDate":
				jsonPromise = self.getByDate(jurisdiction);
			break;
			default:
				throw new Error("Incorrect method provided");
		}
		jsonPromise
		.then(function(data){
			res.json(data.toJSON());
		})
		.catch(function(err){
			throw new Error(err);
		});
	}
	return self;
}
module.exports.statsController = statsController;