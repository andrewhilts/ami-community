var async = require('async');
var Q = require('q');
var _ = require('lodash');

var statsController = function(Request){
	var self = this;
	self.getTotal = function(jurisdiction_id){
		var count = new Request.RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
		})
		.count();
		return new Q.Promise(function(resolve,reject){
			count.then(function(collection){
				resolve(collection);
			})
			count.catch(function(err){
				reject(err);
			})
		});
	}
	self.getVerified = function(jurisdiction_id){
		var count = new Request.RequestCollection()
		.query(function(qb){
			qb.innerJoin('request_contacts', 'requests.request_id', 'request_contacts.request_id');
			qb.where('operator_jurisdiction_id', jurisdiction_id);
		})
		.count();
		return new Q.Promise(function(resolve,reject){
			count.then(function(collection){
				resolve(collection);
			})
			count.catch(function(err){
				reject(err);
			})
		});
	}
	self.getByCompany = function(jurisdiction_id){
		var companies = new Request.RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
		})
		.fetch()
		return new Q.Promise(function(resolve,reject){
			companies.then(function(requests){
				operatorTotals = requests.countBy("operator_id");
				var sortable = [];
				var sortedOperatorTotals = []
				for (var operator in operatorTotals)
				      sortable.push([operator, operatorTotals[operator]])
				sortable.sort(function(a, b) {return a[1] - b[1]})
				
				for (var i=0; i < sortable.length; i++){
					sortedOperatorTotals.push({
						"operator_id": sortable[i][0],
						"total": sortable[i][1]
					});
				}
				if(Object.keys(sortedOperatorTotals).length){
					resolve(sortedOperatorTotals);
				}
				else{
					reject("No events");
				}
			})
			.catch(function(err){
				reject("err");
			})
		});
	}
	self.getByDate = function(jurisdiction_id){
		var dates = new Request.RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
			qb.orderBy('request_date');
		})
		.fetch();
		return new Q.Promise(function(resolve,reject){
			dates.then(function(requests){
				dateTotals = requests.countBy("request_date");
				dateTotals = self.formatDates(dateTotals)
				resolve(dateTotals);
			})
			.catch(function(err){
				reject("err");
			})
		});
	}
	self.formatDates = function(dateRange){
		for(var i=0; i < dateRange.length; i++){
			dateRange[i][0] = moment.utc(dateRange[i][0]).format('YYYY-MM-DD')
		}
		return dateRange;
	}
	self.methodAllocator = function(req, res){
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
		console.log(jsonPromise);
		jsonPromise
		.then(function(data){
			res.json(data);
		})
		.catch(function(err){
			throw new Error(err);
		});
	}
	return self;
}
module.exports.statsController = statsController;