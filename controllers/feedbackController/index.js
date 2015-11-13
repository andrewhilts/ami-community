var feedbackController = function(){
	this.getForm = function(req, res) {
	  res.json({
	    title: 'Feedback!'
	  });
	};
	this.submit = function(req, res) {
	  res.json({
	    title: 'Feedback submitted!!'
	  });
	};
	return this;
}
module.exports.feedbackController = feedbackController;