var timestamper = require('../shared/timestamper');
var Feedback = function(bookshelf){
	var self = this;

	self.feedbackSubmission = bookshelf.Model.extend({
		'tableName': 'feedback_submissions',
		'idAttribute': 'feedback_submission_id'
	});

	self.feedbackItemModel = bookshelf.Model.extend({
		'tableName': 'feedback_submission_items',
		'idAttribute': 'feedback_submission_item_id'
	});

	self.itemCollection = bookshelf.Collection.extend({
		'model': self.feedbackItemModel
	});
	self.saveSubmission = function(){
		return new self.feedbackSubmission({
			'feedback_submission_date': timestamper.getTimestampPSQL()
		})
		.save();
	}
	self.saveOrdinals = function(submission, ordinals){
		var ordinal_items = [];
		var ordinal_keys = Object.keys(ordinals);

		for (var i = ordinal_keys.length - 1; i >= 0; i--) {
			ordinal_items.push({
				'feedback_item_label': ordinal_keys[i],
				'int_value': ordinals[ordinal_keys[i]],
				'feedback_submission_id': submission.get('feedback_submission_id')
			});
		};

		var ordinalCollection = new self.itemCollection(ordinal_items);
		return ordinalCollection.invokeThen('save', null, null);
	}
	self.saveText = function(submission, text){
		var text_items = [];
		var text_keys = Object.keys(text);

		for (var i = text_keys.length - 1; i >= 0; i--) {
			text_items.push({
				'feedback_item_label': text_keys[i],
				'text_value': text[text_keys[i]],
				'feedback_submission_id': submission.get('feedback_submission_id')
			});
		};

		var textCollection = new self.itemCollection(text_items)
		return textCollection.invokeThen('save', null, null);
	}
	return this;
}

exports.FeedbackModel = Feedback;