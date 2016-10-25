var sendgridAPIKey = require('../conf/sendgrid.conf.js').sendgridAPIKey;
var sendgrid = require('sendgrid')(sendgridAPIKey);

var Q = require('q');
var _ = require('lodash');
var policy = require('../conf/policy.conf').policy;

var Email = function(language){
	var self = this;
	var unsubLink = policy.unsubLink
	var from, subject;
	console.log("starting")
	if(policy.languages[language].systemEmailAddress){
		from = policy.languages[language].systemEmailAddress;
	}
	else{
		from = "info@accessmyinfo.org";
	}
	console.log("hi2");
	if(policy.languages[language].defaultSubjectLine){
		subject = policy.languages[language].defaultSubjectLine;
		console.log("hi2a");
	}
	else{
		subject = "A message from Access My Info";
		console.log("hi2b");
	}

	this.message = {
		"subject": subject,
		"from": from
	}
	console.log(this.message);

	this.send = function(params){
		var message = _.defaults(params, self.message);
		return new Q.Promise(function(resolve,reject){
			sendgrid.send(
				message 
			, function(err, json){
				if(err){
					reject(err);
				}
				else{
					resolve(json);
				}
			});
		});
	}
	this.makeUnsubLink = function(address){
		return policy.unsubLink + "?email_address="+encodeURIComponent(address);
	}
}

exports.EmailModel = Email;


