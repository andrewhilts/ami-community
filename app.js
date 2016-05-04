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
app.use(helmet());
app.use(cors({
	origin: policy.AMIFrontEnd.baseURL
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(limiter);
// app.use(cookieParser({''}));
// app.use(csrf());


// app.use(function (err, req, res, next) {
// 	console.log(req.session);
// 	console.log(req.body._csrf);
//   if (err.code !== 'EBADCSRFTOKEN') return next(err)

//   // handle CSRF token errors here
// 	res.status(403)
// 	res.json({
// 		title: 'Error: Form tampered with.'
// 	});
// })
app.use(function(err, req, res, next) {
  if (!err) return next();
  console.log('error on request %d %s %s: %j', process.domain.id, req.method, req.url, err);
  res.send(500, "Something bad happened. :(");
  process.exit(1);
});

// app.get('/enroll', enrollmentController.getForm);
app.post('/enroll', enrollmentController.submit);
app.get('/verify', enrollmentController.verifyAndEnroll);
// app.get('/feedback', feedbackController.getForm);
app.post('/feedback', feedbackController.submit);
app.post('/unsubscribe', unsubscribeController.unsubHandler);

app.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;