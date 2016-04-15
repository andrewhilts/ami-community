var fs = require('fs');
var bookshelf = require('./db').db;
var async = require('async');

var installQueryFile = './install.sql';

// Install database schema
fs.readFile(installQueryFile, "utf-8", function(err, installQuery){
	if(!err){
		bookshelf.knex.raw(installQuery).then(function(resp){
			 bookshelf.knex.destroy();
			console.log(null, resp);
		}).catch(function(error){
			bookshelf.knex.destroy();
			console.log(error);
		});
	}
	else{
		bookshelf.knex.destroy();
		console.log(err);
	}
});