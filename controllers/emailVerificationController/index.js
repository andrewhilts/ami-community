var uuid = require('node-uuid');
var async = require('async');
var policy = require('../../conf/policy.conf').policy;
var timestamper = require('../../shared/timestamper');
var moment = require('moment');
var Email = require('../../models/email').EmailModel;
var Q = require('q');
var EmailTemplate = require('email-templates').EmailTemplate;

var RequestContactVerifier = function(Subscription){
	var self = this;

	this.generateVerificationToken = function(){
		return uuid.v4();
	}

	this.generateTokenExpirationDate = function(){
		var expirationDays = policy.verificationTokenExpirationDays;
		var expirationDate = moment().add(parseInt(expirationDays), 'days');
		return expirationDate;
	}

	this.assignTokenToRequestContact = function(requestContact, token, token_expiration_date){
		return requestContact
		.set({
			'verification_token': token,
			'token_expiration_date': token_expiration_date.format('YYYY-MM-DD'),
			'verified': false
		})
		.save();
	}

	this.sendVerificationEmail = function(request, requestContact){
		var email = new Email();
		var address = requestContact.get('email_address');
		var operator_title = request.get("operator_title");
		var token = requestContact.get('verification_token');
		var verificationURL = policy.AMIFrontEnd.baseURL + policy.AMIFrontEnd.paths.emailVerification + "?token=" + token;
		var unsubscribeURL = policy.unsubLink + "?email_address="+address;

		var language = request.get('language');
		var jurisdiction = request.get('operator_jurisdiction_id');
		var subject; 

		var templateDir = "emailTemplates/confirmation-"+language+"-"+jurisdiction;
		var confirmation = new EmailTemplate(templateDir);

		switch(language){
			case "en":
			subject = "Confirm your request: Access My Info"
			break;
			case "zh":
			subject = "查閱資料要求確認：誰手可得"
			break;
		}
		var params = {
			operator_title: operator_title,
			verificationURL: verificationURL,
			unsubscribeURL: unsubscribeURL
		}
		confirmation.render(params, function(err, results){
			if(err){
				console.log(err);
				return;
			}

			return email.send({
				to:address, 
				subject: subject,
				text: results.text,
				html: results.html
			});
		});
	}

	this.getRequestContactByToken = function(token){
		return request_contact = new Subscription.RequestContactModel()
		.where({'verification_token': token})
		.fetch()
	}

	this.isRequestContactTokenExpired = function(requestContact){
		var expired = false;
		var tokenExpirationMoment = moment(requestContact.get('token_expiration_date'));
		var now = moment();
		if(now.isAfter(tokenExpirationMoment)){
			expired = true;
		}
		return expired;
	}

	this.isRequestAlreadyVerified = function(requestContact){
		return requestContact.get('verified');
	}

	this.markRequestContactAsVerified = function(requestContact){
		return requestContact
		.set({
			'verified': true
		})
		.save();
	}

	this.verifyRequestContact = function(requestContact){
		return new Q.Promise(function(resolve,reject){
			if(!self.isRequestContactTokenExpired(requestContact)){
				if(self.isRequestAlreadyVerified(requestContact)){
					reject({
							"statusCode": "V2", 
							"message": "Already verified."
						});
				}
				else{
					self.markRequestContactAsVerified(requestContact)
					.then(function(savedRequestContact){
						resolve(null, savedRequestContact);
					})
					.catch(function(e){
						reject({
							"statusCode": "D1", 
							"message": "Database Error"
						});
					})
				}
			}
			else{
				reject({
					"statusCode": "V3", 
					"message": "Verification token expired."
				});
			}
		});
	}

	this.createVerificationRequest = function(request, requestContact){
		return new Q.Promise(function(resolve,reject){
			async.waterfall([
				function(callback){
					console.log("generateVerificationToken");
					token = self.generateVerificationToken();
					callback(null, token);
				},
				function(token, callback){
					console.log("generateTokenExpirationDate");
					expirationDate = self.generateTokenExpirationDate();
					callback(null, token, expirationDate);
				},
				function(token, expirationDate, callback){
					console.log("assignTokenToRequestContact");
					self.assignTokenToRequestContact(requestContact, token, expirationDate)
					.then(function(requestContact){
						if(requestContact){
							callback(null, requestContact);
						}	
						else{
							callback({
								"statusCode": "D1", 
								"message": "Database Error"
							});
						}
					})
					.catch(function(e){
						callback(e);
					})
				},
				function(requestContact, callback){
					console.log("sendVerificationEmail");
					self.sendVerificationEmail(request, requestContact)
					.then(function(result){
						callback(null, result);
					})
					.catch(function(e){
						callback({
							"statusCode": "M1", 
							"message": "Unable to send email."
						});
					});
				}
			], function(err, sendResult){
				if(err){
					reject(err);
				}
				else{
					resolve(sendResult);
				}
			});
		});
	}

	this.handleTokenResponse = function(token){
		return new Q.Promise(function(resolve,reject){
			async.waterfall([
				function(callback){
					console.log("getRequestContactByToken");
					self.getRequestContactByToken(token)
					.then(function(requestContact){
						if(requestContact){
							callback(null, requestContact);
						}
						else{
							callback({
								"statusCode": "V4", 
								"message": "Invalid token."
							});
						}
					})
					.catch(function(e){
						callback({
							"statusCode": "V4", 
							"message": "Invalid token."
						});
					});
				},
				function(requestContact, callback){
					console.log("verifyRequestContact");
					self.verifyRequestContact(requestContact)
					.then(function(){
						callback(null, requestContact)
					})
					.catch(function(e){
						callback(e);
					});
				}
			], function(err, requestContact){
				if(err){
					reject(err);
				}
				else{
					resolve(requestContact);
				}
			});
		});
	}
	return this;
}

exports.emailVerificationController = RequestContactVerifier;
