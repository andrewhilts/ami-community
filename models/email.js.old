var mandrillAPIKey = require('../conf/mandrill.conf.js').mandrillAPIKey;
var mandrill = require('mandrill-api');
var mandrill_client = new mandrill.Mandrill(mandrillAPIKey);
var Q = require('q');
var _ = require('lodash');
var policy = require('../conf/policy.conf').policy;

var Email = function(){
	var self = this;
	var unsubLink = policy.unsubLink
	this.message = {
		"subject": "A message from Access My Info",
		"from_email": "notifications@openeffect.ca",
		"headers": {
			"Reply-To": "info@openeffect.ca"
		},
		"important": false,
	    "track_opens": null,
	    "track_clicks": null,
	    "auto_text": null,
	    "auto_html": null,
	    "inline_css": null,
	    "url_strip_qs": null,
	    "preserve_recipients": null,
	    "view_content_link": null,
	    "bcc_address": null,
	    "tracking_domain": null,
	    "signing_domain": null,
	    "return_path_domain": null,
	    "merge": true,
	    "global_merge_vars": [
	    	{
				name: "unsubscribe_link",
				content: policy.unsubLink
			}
	    ],
	    "merge_language": "handlebars"
	}
	this.async = true;
	this.ip_pool = null;
	this.send_at = null;
	this.send = function(params, template){
		params = typeof params !== 'undefined' ? params : {};
		var message = _.defaults(params, self.message);

		return new Q.Promise(function(resolve,reject){
			if(typeof template !== "undefined" && typeof template.template_name !== "undefined" && typeof template.template_content !== "undefined"){
				console.log("sending template");
				mandrill_client.messages.sendTemplate({
					"template_name": template.template_name,
					"template_content": template.template_content,
					"message": message,
					"async": self.async,
					"ip_pool": self.ip_pool,
					"send_at": self.send_at
				}, function(result){
					resolve(result);
				}, function(e){
					reject(e);
				});
			}
			else{
				mandrill_client.messages.send({
					"message": message,
					"async": self.async,
					"ip_pool": self.ip_pool,
					"send_at": self.send_at
				}, function(result){
					resolve(result);
				}, function(e){
					reject(e);
				});
			}
		});
	}
}

exports.EmailModel = Email;


