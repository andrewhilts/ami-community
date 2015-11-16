var Contact = function(bookshelf){
	var self = this;
	var ContactModel = bookshelf.Model.extend({
		'tableName': 'contacts',
		'idAttribute': 'email_address'
	});
	var ContactCollection = bookshelf.Collection.extend({
		'model': EventModel
	});
	this.save = function(email_address){
		var event = new ContactModel({
			'email_address': name
		})
		.save();
		return event;
	}
	return this;
}
module.exports = Contact;