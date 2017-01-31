var async = require('async');
var Q = require('q');
var _ = require('lodash');
var moment = require('moment');
var knex = require('knex');
require('moment-range');

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
			console.log("promise");
			companies.then(function(requests){
				console.log("db ok");
				if(!requests.length){
					resolve({"count": 0});
				}
				operatorTotals = requests.countBy("operator_id");
				var sortable = [];
				var sortedOperatorTotals = []
				for (var operator in operatorTotals)
				      sortable.push([operator, operatorTotals[operator]])
				sortable.sort(function(a, b) {return a[1] - b[1]})
				
				for (var i=0; i < sortable.length; i++){
					sortedOperatorTotals.push({
						"operator_id": sortable[i][0],
						"count": sortable[i][1]
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
	self.getByDate = function(jurisdiction_id, cumulative){
		var dates = new Request.RequestCollection()
		.query(function(qb){
			qb.where('operator_jurisdiction_id', jurisdiction_id);
			qb.orderBy('request_date');
		})
		.fetch();
		return new Q.Promise(function(resolve,reject){
			dates.then(function(requests){
				if(!requests.length){
					resolve({"count": 0});
				}
				console.log(requests.first());
				requests.each(function(request){
					request.set("month", moment.utc(request.get("request_date"), "ddd MMM DD YYYY").add("days", 1).format('MMM YYYY'));
				})
				// console.log(requets[0]["month"]);
				dateTotals = requests.countBy("month");
				dateTotals = self.formatDates(dateTotals, cumulative)
				resolve(dateTotals);
			})
			.catch(function(err){
				reject("err");
			})
		});
	}
	self.formatDates = function(dateRange, cumulative){
		var dates = Object.keys(dateRange);
		var formattedDateRange = [];
		var startDate, endDate, momentRange, finalRange;
		finalRange = [];
		for(var i=0; i < dates.length; i++){
			// console.log(typeof dates[i]);
			// console.log(moment(dates[i], "ddd MMM DD YYYY").format('YYYY-MM-DD, h:mm:ss'));
			// console.log(moment(dates[i] + " UTC", "ddd MMM DD YYYY").format('YYYY-MM-DD, h:mm:ss'));
			// console.log(moment.utc(dates[i], "ddd MMM DD YYYY").utcOffset(-4).format('YYYY-MM-DD, h:mm:ss'));
			// console.log(moment.utc(dates[i], "ddd MMM DD YYYY").utcOffset(+4).format('YYYY-MM-DD, h:mm:ss'));
			// console.log(moment.utc(dates[i]+ " UTC", "ddd MMM DD YYYY").utcOffset(-4).format('YYYY-MM-DD, h:mm:ss'));
			// console.log(moment.utc(dates[i]+ " UTC", "ddd MMM DD YYYY").utcOffset(+4).format('YYYY-MM-DD, h:mm:ss'));
			// console.log(moment(dates[i], "ddd MMM DD YYYY").utcOffset(-4).format('YYYY-MM-DD, h:mm:ss'));
			// console.log(moment(dates[i], "ddd MMM DD YYYY").utcOffset(+4).format('YYYY-MM-DD, h:mm:ss'));
			// console.log(moment(dates[i]+ " UTC", "ddd MMM DD YYYY").utcOffset(+16).format('YYYY-MM-DD, h:mm:ss'));
			// console.log(moment(dates[i]+ " UTC", "ddd MMM DD YYYY").utcOffset(+4).format('YYYY-MM-DD, h:mm:ss'));
			formattedDateRange.push({
				"request_date": moment.utc(dates[i], "MMM YYYY").format('MMM YYYY'),
				"count": dateRange[dates[i]]
			})
		}
		startDate = moment(formattedDateRange[0].request_date, 'MMM YYYY')
		endDate = moment(formattedDateRange[formattedDateRange.length-1].request_date, 'MMM YYYY')
		momentRange = moment.range(startDate, endDate);
		momentRange.by('months', function(moment){
			dateStr = moment.format('MMM YYYY');
			var finalData = {};
			var dateData = _.find(formattedDateRange, {"request_date": dateStr})
			if(dateData){
				finalData.request_date = dateData.request_date;
				finalData.count = dateData.count;
			}
			else{
				finalData.request_date = dateStr;
				finalData.count = 0;
			}
			finalRange.push(finalData);
		});
		if(cumulative){
			for(var i = 0; i < finalRange.length; i++){
				if(i > 0){
					finalRange[i].count = finalRange[i-1].count + finalRange[i].count;
				}
			}
		}
		return finalRange;
	}
	self.methodAllocator = function(req, res){
		var method = req.params.method;
		var jurisdiction = parseInt(req.params.jurisdiction);
		var jsonPromise;
		if(isNaN(jurisdiction)){
			throw new Error("jurisdiction not a number");
		}
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
				jsonPromise = self.getByDate(jurisdiction, false);
			break;
			case "getByDateCumulative":
				jsonPromise = self.getByDate(jurisdiction, true);
			break;
			default:
				res.status(404).json({msg: "error"});
				return null;
		}
		console.log(jsonPromise);
		jsonPromise
		.then(function(data){
			res.json(data);
		})
		.catch(function(err){
			console.log(err);
			res.status(404).json({msg: "error: "+err});
		});
	}
	return self;
}
module.exports.statsController = statsController;