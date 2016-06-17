var settings = require('../conf/db.conf.js');
console.log(settings.db_conn)
console.log(process.version)
console.log(process.env.USER)
console.log(process.env.SHELL)
var knex = require('knex')({
  client: 'pg',
  connection: settings.db_conn
  // debug: true
});

var db = require('bookshelf')(knex);

exports.db = db;