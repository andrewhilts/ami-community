var async = require('async');
var Q = require('q');

var statsController = function(Request){
	this.getTotal = function(jurisdiction_id){
		return new RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
		})
		.count();
	}
	this.getVerified = function(jurisdiction_id){
		return new RequestCollection()
		.query(function(qb){
			qb.innerJoin('request_contacts', 'requests.request_id', 'request_contacts.request_id');
			qb.where('operator_jurisdiction_id', jurisdiction_id);
		})
		.count();
	}
	this.getByCompany = function(jurisdiction_id){
		return new RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
			qb.groupBy('operator_id');
		})
		.count();
	}
	this.getByDate = function(jurisdiction_id){
		return new RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
			qb.groupBy('operator_id');
		})
		.count();
	}
	this.methodAllocator = function(res, req){
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
				jsonPromise = this.getTotal(jurisdiction);
			break;
			case "getVerified":
				jsonPromise = this.getVerified(jurisdiction);
			break;
			case "getByCompany":
				jsonPromise = this.getByCompany(jurisdiction);
			break;
			case "getByDate":
				jsonPromise = this.getByDate(jurisdiction);
			break;
			default:
				throw new Error("Incorrect method provided");
		}
		jsonPromise.then(function(err, data){
			if(err){
				throw new Error(err);
			}
			else{
				res.json(data.toJSON());
			}
		});
	}
	return this;
}
module.exports.statsController = statsController;