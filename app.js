var express = require('express');
var bodyParser = require('body-parser');
var rateLimit = require('express-rate-limit');
var helmet = require('helmet');
var cookieParser = require('cookie-parser');
// var session = require('express-session');
var csrf = require('csurf')
var cors = require('cors');
var bookshelf = require('./database/db').db;
var Request = require('./models/request.js').RequestController(bookshelf);
var Subscription = require('./models/subscription.js').SubscriptionController(bookshelf);
var Event = require('./models/event.js').EventController(bookshelf);
var RequestEvent = require('./models/requestevent.js').RequestEventController(bookshelf);
var Email = require('./models/email.js').EmailModel;
var Feedback = require('./models/feedback.js').FeedbackModel(bookshelf);
var policy = require('./conf/policy.conf').policy;
var uuid = require('node-uuid');
var app = express();

var limiter = rateLimit({
	windowMS: 60000,
	delayAfter: 0,
	delayMS: 0,
	max: policy.rateLimitMaxPerMinute,
	message: "Too many requests. Please try again later.",
	statusCode: 429
});

var enrollmentController = require('./controllers/enrollmentController/index.js').enrollmentController(Request, Subscription, Event, RequestEvent, Email);
var feedbackController = require('./controllers/feedbackController/index.js').feedbackController(Feedback);
var unsubscribeController = require('./controllers/unsubscribeController/index.js').unsubscribeController(Subscription);
// var parseForm = bodyParser.urlencoded({ extended: false })

app.set('port', process.env.PORT || 3000);

app.post('/enroll', bodyParser.urlencoded({ extended: true }).json, helmet, limiter, enrollmentController.submit);
app.get('/verify', bodyParser.urlencoded({ extended: true }).json, helmet, limiter, enrollmentController.verifyAndEnroll);
// app.get('/feedback', feedbackController.getForm);
app.post('/feedback', bodyParser.urlencoded({ extended: true }).json, helmet, limiter, feedbackController.submit);
app.post('/unsubscribe', bodyParser.urlencoded({ extended: true }).json, helmet, limiter, unsubscribeController.unsubHandler);

var myLogger = function (err, req, res, next) {
  console.log('error on request %s %s: %s', req.method, req.url, err);
  res.status(500).send("Something bad happened. :(");
  process.exit(1);
};

app.use(myLogger);

app.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;