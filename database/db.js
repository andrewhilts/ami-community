var settings = require('../conf/db.conf.js');
console.log(settings.db_conn)
var knex = require('knex')({
  client: 'pg',
  connection: settings.db_conn
  // debug: true
});

var db = require('bookshelf')(knex);

exports.db = db;