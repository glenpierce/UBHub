import express from 'express';
import path from 'path';
import favicon from 'serve-favicon';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import clientSessions from 'client-sessions';

import account from './routes/account.js';
import createUser from './routes/createUser.js';
import home from './routes/home.js';
import login from './routes/login.js';
import map from './routes/map.js';
import spreadSheet from './routes/spreadSheet.js';
import spreadSheetAPI from './routes/spreadSheetAPI.js';
import users from './routes/users.js';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import config from './config.js';

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// We are behind a load balancer
app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.connection.proxySecure = true;
  next();
});

app.use(clientSessions({
  cookieName: 'session',
  secret: config.secret,
  duration: config.expires,
  cookie: {
    maxAge: config.expires,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
  }
}));

app.use('/account', account);
app.use('/createUser', createUser);
app.use('/', home);
app.use('/login', login);
app.use('/map', map);
app.use('/spreadSheet', spreadSheet);
app.use('/api/admin', spreadSheetAPI);
app.use('/users', users);

app.use(logger('dev'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
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

export default app;
