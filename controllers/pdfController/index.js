var async = require('async');
var wkhtmltopdf = require('wkhtmltopdf');
var he = require('he');

var pdfController = function(){
	var self = this;

	this.buildAndRespond = function(req, res) {
	  	async.waterfall([
	  		function(callback){
	  			self.validateParams(req, callback);
	  		},
	  		function(html, callback){
	  			self.buildPDF(html, res);
	  		}
	  	], function(err, pdf){
	  		if(err){
	  			res.json({
	  				"err": err
	  			})
	  		}
	  	});
	};

	this.validateParams = function(request, callback){
		var html;
		try{
			html = request.body.html;
			console.log(html);
		}
		catch(e){
			callback("No pdf content provided");
		}
		if(html === "" || html === null || typeof html === "undefined"){
			callback("No pdf content provided");
		}
		else{
			callback(null, html);
		}
	}
	
	this.buildPDF = function(html, res){
		wkhtmltopdf(html, { pageSize: 'letter' }).pipe(res);
		res.setHeader('Content-type', 'application/pdf');    // Header to force download
    	res.setHeader('Content-disposition', 'attachment; filename=response.pdf')
	}

	return this;
}
module.exports.pdfController = pdfController;