
var unsubscribeController = function(Subscription){
	var self = this;

	self.deleteContactByEmail = function(email_address){
		return contact = new Subscription.ContactModel({
			"email_address": email_address
		})
		.destroy({"require": true, "transacting": true});
	}

	self.unsubscribe = function(email_address){
		return self.deleteContactByEmail(email_address);
	}

	self.unsubHandler = function(req, res){
		var email_address = req.body.email_address;
		console.log(req.body);
		self.unsubscribe(email_address)
		.then(function(model){
			res.json({
				"message": {
					"status_code": "U1",
					"message:" "Successfully unsubscribed " + email_address + " from all AMI messages.",
					"data": {
						"email_address": email_address
					}
				}
			});
		})
		.catch(function(e){
			res.json({
				"message": {
					"status_code": "U2",
					"message": "Unable to unsubscribe " + email_address + ".",
					"data": {
						"email_address": email_address
					}
				}
			});
		})
	}

	return self;
}

module.exports.unsubscribeController = unsubscribeController;