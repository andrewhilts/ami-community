var language = {
		lang: "en",
		feedback: "Last chance: Share your Access My Info results to enter to win $50 Amazon credit",
		systemEmailAddress: "info@accessmyinfo.org",
		confirmSubjectLine: "Request confirmed: Access My Info",
		defaultSubjectLine: "A message from Access My Info",
		verifySubjectLine: "Confirm your request: Access My Info",
		logoFileName: "AMICAFullLogoWhiteBackground.png"
	}
exports.addLanguageToPolicy = function(policy){
	if(typeof policy.languages == "undefined"){
		policy.languages = {};
	}
	policy.languages["en"] = language;
	return policy;
}
