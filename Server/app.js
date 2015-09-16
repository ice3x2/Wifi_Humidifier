var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var indexRoutes = include('index');
var authRoutes = include('auth');
var ctrlRoutes = include('ctrl');
var statusRoutes = include('status');

var app = express();
var log = include('ColorLog');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoutes);
app.use('/ctrl', ctrlRoutes);
app.use('/status', statusRoutes);
app.use('/js', express.static(path.join(__dirname, 'build/js')));
app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));
app.use('/css', express.static(path.join(__dirname, 'build/css')));
app.use('/img', express.static(path.join(__dirname, 'build/img')));
app.use('/', indexRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  console.dir(req.path);
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    console.log(err.stack);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
