var fs = require('fs');
var bookshelf = require('./db').db;

var installQueryFile = './install.sql';

fs.readFile(installQueryFile, "utf-8", function(err, installQuery){
	if(!err){
		bookshelf.knex.raw(installQuery).then(function(resp){
			console.log(null, resp);
		}).catch(function(error){
			console.log(error);
		});
	}
	else{
		console.log(err);
	}
});