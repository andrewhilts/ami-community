var async = require('async');
var Q = require('q');
var validator = require("email-validator");

var Subscription = function(bookshelf){
	var self = this;
	var ContactModel = bookshelf.Model.extend({
		'tableName': 'contacts',
		'idAttribute': 'email_address'
	});
	var RequestContactModel = bookshelf.Model.extend({
		'tableName': 'request_contacts',
		'idAttribute': 'request_contact_id'
	});
	var ContactCollection = bookshelf.Collection.extend({
		'model': ContactModel
	});
	var RequestContactCollection = bookshelf.Collection.extend({
		'model': RequestContactModel
	});
	this.subscribe = function(consent, email_address, request_id){
		var self = this;
		this.validateEmail = function(callback){
			console.log("\t validateEmail");
			if(validator.validate(email_address)){
				callback(null);
			}
			else{
				callback("Invalid email address");
			}
		}
		this.contactExists = function(callback){
			console.log("\t contactExists");
			var contact = new ContactModel({
				'email_address': email_address
			})
			.fetch()
			.then(function(savedContact){
				if(savedContact){
					callback(null, savedContact);
				}
				else{
					callback(null, savedContact);
				}
			})
			.catch(function(err){
				callback(err);
			})
		}
		this.saveIfNotExists = function(savedContact, callback){
			console.log("\t saveIfNotExists", savedContact);
			if(savedContact){
				callback(null, savedContact);
			}
			else{
				console.log("\t\t saving", email_address, consent);
				self.save(consent, email_address)
				.then(function(savedContact){
					if(savedContact){
						callback(null, savedContact);
					}
					else{
						callback("No contact saved");
					}
				})
				.catch(function(error){
					callback(error);
				})
			}
		}
		this.saveRequestContact = function(savedContact, callback){
			console.log("\t saveRequestContact");
			if(consent){
				var requestContact = new RequestContactModel({
					'email_address': savedContact.get('email_address'),
					'request_id': request_id
				})
				.save()
				.then(function(savedRequestContact){
					if(savedRequestContact){
						callback(null, savedRequestContact);
					}
					else{
						callback("No contact saved");
					}
				})
				.catch(function(error){
					callback(error);
				})
			}
			else{
				callback("No consent given");
			}
		}
		this.save = function(consent, email_address){
			if(consent){
				console.log(email_address);
				return contact = new ContactModel({
					'email_address': email_address
				})
				.save(null, {method: 'insert'});
			}
			else{
				return new Q.Promise(function(resolve,reject){
					resolve(null);
				});
			}
		}

		return new Q.Promise(function(resolve,reject){
			if(consent){
				async.waterfall([
					self.validateEmail,
					self.contactExists,
					self.saveIfNotExists,
					self.saveRequestContact,
					self.verify
				], function(err, result){
					if(err){
						reject(err);
					}
					else{
						resolve(result);
					}
				});
			}
			else{
				resolve(null);
			}
		});
	}
	
	this.unsubscribe = function(){
		return null;
	}
	return this;
}
module.exports.SubscriptionController = Subscription;