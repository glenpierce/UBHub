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
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

app.use('/', index);
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

//to setup docker mysql: docker run --name episql -e MYSQL_ROOT_PASSWORD=my-secret-pw -p 3306:3306 mysql
//this port is in use according to Docker, how can I make sure that a port is valid for me to use?

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: config.rdsHost,
    user: config.rdsUser,
    password: config.rdsPassword,
    database: config.rdsDatabase
});

// connection.connect();
//
// connection.query('SELECT * from Users', function(err, rows, fields) {
//     if (!err)
//         console.log('The user db contains: ', rows);
//     else
//         console.log('Error while performing Query.');
// });
//
// connection.end();

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
