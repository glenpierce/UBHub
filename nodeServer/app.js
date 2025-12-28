import express from 'express';
import path from 'path';
import favicon from 'serve-favicon';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import clientSessions from 'client-sessions';

import index from './routes/index.js';
import login from './routes/login.js';
import users from './routes/users.js';
import createUser from './routes/createUser.js';
import dashboard from './routes/dashboard.js';
import forum from './routes/forum.js';
import indicators from './routes/indicators.js';
import createCustomProgram from './routes/createCustomProgram.js';
import createIndicator from './routes/createCustomIndicator.js';
import changeLocation from './routes/changeLocation.js';
import createLocation from './routes/createLocation.js';
import map from './routes/map.js';
import gis from './routes/gis.js';
import yourUploads from './routes/yourUploads.js';
import editUpload from './routes/editUpload.js';
import createNewUpload from './routes/createNewUpload.js';
// import aboutUs from './routes/aboutUs.js';
import aboutUsWp from './routes/aboutUsWp.js';
import resources from './routes/resources.js';
import home from './routes/home.js';
import account from './routes/account.js';
import programs from './routes/programs.js';
import program from './routes/program.js';
import statusReport from './routes/statusReport.js';
import createUserDataFromJSON from './routes/createUserDataFromJSON.js';
import createCustomIndicatorValues from './routes/createCustomIndicatorValues.js';
import news from './routes/news.js';
import spreadSheetAPI from './routes/spreadSheetAPI.js';
import spreadSheet from './routes/spreadSheet.js';

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

console.log(config.secret);

app.use(clientSessions({
    cookieName: 'session',
    secret: config.secret,
    cookie: {
        maxAge: new Date(Date.now() + (config.expires))
    }
}));

app.use('/', home);
// app.use('/getInvolved', index);
app.use('/login', login);
app.use('/users', users);
// app.use('/createUser', createUser);
// app.use('/dashboard', dashboard);
// app.use('/forum', forum);
// app.use('/indicators', indicators);
// app.use('/createCustomProgram', createCustomProgram);
// app.use('/createCustomIndicator', createIndicator);
// app.use('/changeLocation', changeLocation);
// app.use('/createLocation', createLocation);
app.use('/map', map);
// app.use('/gis', gis);
// app.use('/yourUploads', yourUploads);
// app.use('/editUpload', editUpload);
// app.use('/createNewUpload', createNewUpload);
// app.use('/aboutUs', aboutUsWp);
// app.use('/resources', resources);
// app.use('/home', home);
// app.use('/account', account);
// app.use('/programs', programs);
// app.use('/program', program);
// app.use('/statusReport', statusReport);
// app.use('/createUserDataFromJSON', createUserDataFromJSON);
// app.use('/createCustomIndicatorValues', createCustomIndicatorValues);
// app.use('/news', news);
app.use('/api/admin', spreadSheetAPI);
app.use('/spreadSheet', spreadSheet);

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
