var fs = require('fs');
var bookshelf = require('./db').db;
var async = require('async');

var Event = require('../models/event').EventController(bookshelf);


// Install jurisdiction event profiles
var path = '../jurisdiction_events/';
 fs.readdir(path, function(err, files){
 	if(!err){
 		async.forEachOf(files, parseEventFile, function(err){
 			if(err) {
				console.log(err.detail);
			 	console.log("Jurisdiction event not created.");
			}
			else{
				console.log("Jurisdiction event not created.");
			}
			bookshelf.knex.destroy();
		 });
	 }
	 else{
		bookshelf.knex.destroy();
	 }
 });
saveEventFile = function(filename){
	parseEventFile(filename, null, function(err){
		if(err) console.log(err);
	});
}

parseEventFile = function(value, key, callback){
	if(fs.lstatSync(path + value).isFile()){
		fs.readFile(path + value, "utf-8", function(err, file){
			if(!err){
				try{
				data = JSON.parse(file);
				}
				catch(e){
					return;
				}
					formattedData = formatDataForSave(data);
					if(formattedData){
						async.forEachOf(formattedData, saveEvent, function(err){
							callback(err);
						});
					}
					else{
						callback(null, data);
					}
			}
			else{
				callback();
			}
		});
	}
	else{
		callback();
	}
}

saveEvent = function(eventObj, key, callback){
	Event.save(
		eventObj.name, 
		eventObj.description, 
		eventObj.jurisdiction_id, 
		eventObj.days_to_reminder,
		eventObj.email_template
	)
	.then(function(model){
		callback();
	})
	.catch(function(err){
		callback(err);
	});
}

formatDataForSave = function(data){
	var formattedData = [];
	var jurisdiction_id = data.jurisdiction_id;
	try{
		for(var i=0; i < data.events.length; i++){
			formattedData[i] = {
				'jurisdiction_id' : jurisdiction_id,
				'name' : data.events[i].name,
				'description' : data.events[i].description,
				'days_to_reminder' : data.events[i].days_to_reminder,
				'email_template' : data.events[i].email_template,
				'email_subject' : data.events[i].email_subject
			}
		}
	}
	catch(e){
		return false;
	}
	return formattedData;
}
