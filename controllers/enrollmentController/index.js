var enrollmentController = function(Request){
	this.getForm = function(req, res) {
	  res.json({
	    title: 'Enrollment!'
	  });
	};
	this.submit = function(req, res) {
		Request.save(
			req.body.data.date, 
			req.body.data.operator.title, 
			req.body.data.operator.id, 
			req.body.data.jurisdiction.title, 
			req.body.data.jurisdiction.id,
			function(err, reqModel){
			  res.json({
			    title: err  //req.body.data.operator.title
			  });
			});
	};
	return this;
}
module.exports.enrollmentController = enrollmentController;