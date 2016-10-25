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
		var language = request.get('language');
		var email = new Email(language);
		var address = requestContact.get('email_address');
		var operator_title = request.get("operator_title");
		var token = requestContact.get('verification_token');
		console.log(token);
		var verificationURL = policy.AMIFrontEnd.baseURL + policy.AMIFrontEnd.paths.emailVerification + "?token=" + token;
		var unsubscribeURL = email.makeUnsubLink(address);

		var jurisdiction = request.get('operator_jurisdiction_id');
		var subject, amiLogoPath; 

		var templateDir = "emailTemplates/verification-"+language+"-"+jurisdiction;
		var verificationTemplate = new EmailTemplate(templateDir);

		if(typeof policy.languages !== "undefined" && typeof policy.languages[language] !== "undefined" && typeof policy.languages[language].logoFileName !== "undefined"){
			amiLogoPath = policy.AMIFrontEnd.baseURL + policy.AMIFrontEnd.paths.logo + "/" + policy.languages[language].logoFileName;
		}
		else{
			amiLogoPath = policy.AMIFrontEnd.baseURL + policy.AMIFrontEnd.paths.logo + "/AMICAFullLogoWhiteBackground.png";
		}
		if(typeof policy.languages !== "undefined" && typeof policy.languages[language] !== "undefined" && typeof policy.languages[language].verifySubjectLine !== "undefined"){
			subject = policy.languages[language].verifySubjectLine;
		}
		else{
			subject = "Confirm your request: Access My Info";
		}
		console.log(subject, amiLogoPath);
		var params = {
			operator_title: operator_title,
			verificationURL: verificationURL,
			unsubscribeURL: unsubscribeURL,
			amiLogoPath: amiLogoPath
		}
		return new Q.Promise(function(resolve,reject){
			verificationTemplate.render(params, function(err, results){
				if(err){
					console.log(err);
					reject(err);
				}

				email.send({
					to:address, 
					subject: subject,
					text: results.text,
					html: results.html
				})
				.then(function(result){
					resolve(result);
				})
				.catch(function(err){
					console.log(err);
					reject(err);
				})
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
