var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('client-sessions');

var index = require('./routes/index');
var login = require('./routes/login');
var users = require('./routes/users');
var createUser = require('./routes/createUser');
var dashboard = require('./routes/dashboard');
var forum = require('./routes/forum');
var indicators = require('./routes/indicators');
var createCustomProgram = require('./routes/createCustomProgram');
var createIndicator = require('./routes/createCustomIndicator');
var changeLocation = require('./routes/changeLocation');
var createLocation = require('./routes/createLocation');
var map = require('./routes/map');
var yourUploads = require('./routes/yourUploads');
var editUpload = require('./routes/editUpload');
var createNewUpload = require('./routes/createNewUpload');
var aboutUs = require('./routes/aboutUs');
var resources = require('./routes/resources');
var home = require('./routes/home');
var account = require('./routes/account');
var iNaturalist = require('./routes/iNaturalist');
var programs = require('./routes/programs');
var newProgramRoute = require('./routes/newprogram');
var statusReport = require('./routes/statusReport');

var config = require('./config.js');

// var https = require('https');
// var fs = require('fs');
//
// var sslkey = fs.readFileSync('ssl-key.pem');
// var sslcert = fs.readFileSync('ssl-cert.pem');
//
// var options = {
//     key: sslkey,
//     cert: sslcert
// };
//
// var app = express.createServer(options);
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

app.use('/', home);
app.use('/getInvolved', index);
app.use('/login', login);
app.use('/users', users);
app.use('/createUser', createUser);
app.use('/dashboard', dashboard);
app.use('/forum', forum);
app.use('/indicators', indicators);
app.use('/createCustomProgram', createCustomProgram);
app.use('/createCustomIndicator', createIndicator);
app.use('/changeLocation', changeLocation);
app.use('/createLocation', createLocation);
app.use('/map', map);
app.use('/yourUploads', yourUploads);
app.use('/editUpload', editUpload);
app.use('/createNewUpload', createNewUpload);
app.use('/aboutUs', aboutUs);
app.use('/resources', resources);
app.use('/home', home);
app.use('/account', account);
app.use('/iNaturalist', iNaturalist);
app.use('/programs', programs);
app.use('/newprogram', newProgramRoute);
app.use('/dataEntry', dataEntry);
app.use('/statusReport', statusReport);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
