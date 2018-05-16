var language = {
		lang: "fr",
		feedback: "Dernière chance: Partagez vos résultats Obtenir mes infos pour gagner 50$ de crédit Amazon",
		systemEmailAddress: "info@accessmyinfo.org",
		confirmSubjectLine: "Demande confirmée : Obtenir mes infos",
		defaultSubjectLine: "Message : Obtenir mes infos",
		verifySubjectLine: "Confirmez votre demande : Obtenir mes infos",
		logoFileName: "AMICAFullLogoWhiteBackground-fr.png"
	}
exports.addLanguageToPolicy = function(policy){
	if(typeof policy.languages == "undefined"){
		policy.languages = {};
	}
	policy.languages["fr"] = language;
	return policy;
}
