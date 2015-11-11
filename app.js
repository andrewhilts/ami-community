var express = require('express');
var bodyParser = require('body-parser');
var rateLimit = require('express-rate-limit');
var helmet = require('helmet');
var cookieParser = require('cookie-parser')
var csrf = require('csurf')
var cors = require('cors');

var app = express();

var limiter = rateLimit({
	windowMS: 60000,
	delayAfter: 0,
	delayMS: 0,
	max: 5,
	message: "Too many requests. Please try again later.",
	statusCode: 429
});

var enrollmentController = require('./controllers/enrollmentController');
var feedbackController = require('./controllers/feedbackController');
// var parseForm = bodyParser.urlencoded({ extended: false })

app.set('port', process.env.PORT || 3000);

app.use(helmet());
app.use(cors({
	origin: "http://0.0.0.0:9000"
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(limiter);
app.use(cookieParser("helmet"));

// app.use(csrf({ cookie: true }));

app.use(function (err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err)

  // handle CSRF token errors here
console.log(req);
  res.status(403)
  res.send('form tampered with')
})

app.get('/enroll', enrollmentController.getForm);
app.post('/enroll', enrollmentController.submit);
app.get('/feedback', feedbackController.getForm);
app.post('/feedback', feedbackController.submit);

app.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;