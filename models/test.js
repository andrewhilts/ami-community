var Email = require('./email').EmailModel;
var policy = require('../conf/policy.conf').policy;
var e = new Email();

var verificationURL = policy.AMIFrontEnd.baseURL + policy.AMIFrontEnd.paths.emailVerification + "?token="
var unsubscribeURL = policy.unsubLink + "?email_address="

var EmailTemplate = require('email-templates').EmailTemplate

var language = 'en';
var jurisdiction = 33;
var subject; 

var templateDir = "../emailTemplates/confirmation-"+language+"-"+jurisdiction;

switch(language){
	case "en":
	subject = "Confirm your request: Access My Info"
	break;
	case "zh":
	subject = "查閱資料要求確認：誰手可得"
	break;
}

var confirmation = new EmailTemplate(templateDir)

var to = 'andrew@openeffect.ca'

var params = {
	operator_title: "Rogers",
	verificationURL: verificationURL,
	unsubscribeURL: unsubscribeURL+'andrew@openeffect.ca'
}
confirmation.render(params, function(err, results){
	if(err){
		console.log(err);
		return;
	}

	e.send({
		to:to, 
		subject: subject,
		text: results.text,
		html: results.html
	})
	.then(function(result){
		console.log("sent", result);
	})
	.catch(function(err){
		console.log("error", err);
	});

});
