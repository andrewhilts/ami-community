var async = require('async');

var feedbackController = function(Feedback){
	var self = this;
	this.getForm = function(req, res) {
	  res.json({
	    title: 'Feedback!'
	  });
	};
	this.submit = function(req, res) {
	  if(Object.keys(req.body.ordinals).length || Object.keys(req.body.text).length){
	  	ordinals = req.body.ordinals
	  	text = req.body.text;

	  	async.waterfall([
			function(callback){
				Feedback.saveSubmission()
				.then(function(submission){
					callback(null, submission);
				})
				.catch(function(err){
					callback(err);
				})
			},
			function(submission, callback){
				Feedback.saveOrdinals(submission, ordinals)
				.then(function(ordinalCollection){
					callback(null, submission, ordinalCollection);
				})
				.catch(function(err){
					console.log(err);
					callback(err);
				})
			},
			function(submission, ordinalCollection, callback){
				Feedback.saveText(submission, text)
				.then(function(textCollection){
					callback(null, textCollection, ordinalCollection, submission);
				})
				.catch(function(err){
					callback(err);
				})
			}
		], 
		function(err, textCollection, ordinalCollection, submission){
			if(err){
				res.status(400);
				msg = {
					"statusCode": "F2"
				}
			}
			else{
				msg =	{
					"statusCode": "F1"
				}
			}
			res.json({
				message: msg
			})
		});
	  }
	  else{
	  	res.status(400);
	  	res.json({
			message: {
				"statusCode": "F3"
			}
		});
	  }
	};
	return this;
}
module.exports.feedbackController = feedbackController;