let express = require('express');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let session = require('client-sessions');

let index = require('./routes/index');
let login = require('./routes/login');
let users = require('./routes/users');
let createUser = require('./routes/createUser');
let dashboard = require('./routes/dashboard');
let forum = require('./routes/forum');
let indicators = require('./routes/indicators');
let createCustomProgram = require('./routes/createCustomProgram');
let createIndicator = require('./routes/createCustomIndicator');
let changeLocation = require('./routes/changeLocation');
let createLocation = require('./routes/createLocation');
let map = require('./routes/map');
let yourUploads = require('./routes/yourUploads');
let editUpload = require('./routes/editUpload');
let createNewUpload = require('./routes/createNewUpload');
let aboutUs = require('./routes/aboutUs');
let resources = require('./routes/resources');
let home = require('./routes/home');
let account = require('./routes/account');
let programs = require('./routes/programs');
let newProgramRoute = require('./routes/program');
let statusReport = require('./routes/statusReport');
let createUserDataFromJSON = require('./routes/createUserDataFromJSON');
let createCustomIndicatorValues = require('./routes/createCustomIndicatorValues');
let news = require('./routes/news');

let config = require('./config.js');

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
let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
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
app.use('/login', login); //
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
app.use('/programs', programs);
app.use('/program', newProgramRoute);
app.use('/statusReport', statusReport);
app.use('/createUserDataFromJSON', createUserDataFromJSON);
app.use('/createCustomIndicatorValues', createCustomIndicatorValues);
app.use('/news', news);

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
