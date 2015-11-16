var enrollmentController = function(Request){
	this.getForm = function(req, res) {
		res.json({
			title: 'Enrollment!'
		});
	};
	this.submit = function(req, res) {
		var res = res;
		Request.save(
			req.body.data.date, 
			req.body.data.operator.title, 
			req.body.data.operator.id, 
			req.body.data.jurisdiction.title, 
			req.body.data.jurisdiction.id
		)
		.then(function(reqModel){
			if(typeof reqModel === "undefined"){
				res.json({
					title: "System Error. Can't save at this time."
				});
			}
			else{
				getRequestCount(res, req, reqModel)
			}
		})
		.catch(function(err){
			console.log(err);
			res.json({
				title: "System Error. Can't save at this time."
			});
		})
	};
	var getRequestCount = function(res, req, reqModel){
		console.log("Getting count");
		Request.getRequestCountForOperator(
			reqModel.get('operator_id'), 
			reqModel.get('operator_jurisdiction_id')
		)
		.then(function(reqCount){
			res.json({
				title: "Thank you. There are now " + reqCount + " requests created for " + reqModel.get('operator_title') + " in " + reqModel.get('operator_jurisdiction') + "."
			});
		});
	}
	return this;
}
module.exports.enrollmentController = enrollmentController;