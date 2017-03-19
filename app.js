var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var bcrypt = require('bcryptjs');
var passport = require('passport');
var session = require('express-session');

var index = require('./routes/index');
var users = require('./routes/users');
var createUser = require('./routes/createUser');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/createUser', createUser);

//to setup docker mysql: docker run --name episql -e MYSQL_ROOT_PASSWORD=my-secret-pw -p 3306:3306 mysql
//this port is in use according to Docker, how can I make sure that a port is valid for me to use?

// required for passport
app.use(session({ secret: process.argv[2] })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

// process.argv.forEach(function (val, index, array) {
//     console.log(index + ': ' + val);
// });

const then = new Date().getTime();
var salt = bcrypt.genSaltSync(10);
var hash = bcrypt.hashSync("password", salt);
console.log(bcrypt.compareSync("password", hash)); // true
console.log(bcrypt.compareSync("not_bacon", hash)); // false
console.log(new Date().getTime() - then);

// console.log(process.env)

var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : process.argv[2],
    database : 'epistemolog'
});

connection.connect();

connection.query('SELECT * from Users', function(err, rows, fields) {
    if (!err)
        console.log('The user db contains: ', rows);
    else
        console.log('Error while performing Query.');
});

connection.end();

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
