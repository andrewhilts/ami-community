var moment = require('moment');

module.exports = {
	formatForPSQL: function(dateString){
		var dateStamp = moment(dateString, "MMMM DD, YYYY").format('YYYY-MM-DD');
		return dateStamp;
	},
	getTimestampPSQL: function(){
		var timestamp = moment().format('YYYY-MM-DD HH:mm:ssZZ');
		return timestamp;
	},
	getTimestampAWS: function(){
		var timestamp = moment().utc().format('YYYY-MM-DDTHH:mm:ss') + ".000Z"
		return timestamp;
	}
};