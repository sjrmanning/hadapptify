var express = require('express');
var app = module.exports = express();
var session = require('express-session');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sass = require('node-sass');
var sassMiddleware = require('node-sass-middleware');
var socket_io = require('socket.io');
var io = socket_io();
app.io = io;

var config = require('./config');
var routes = require('./routes/index');
var users = require('./routes/users');
var client = require('./lib/client');
var chat = require('./lib/chat');

var sessionMiddleware = session({
    secret: 'mount whateverest',
    resave: true,
    saveUninitialized: true
});

app.chatlog = [];

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

app.use(sessionMiddleware);
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(sassMiddleware({
    src: __dirname + '/sass',
    dest: __dirname + '/public',
    debug: true,
    outputStyle: 'compressed'
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
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

// Sockets
app.io.on('connection', function (socket) {
    chat.setupSocket(socket);
    client.setupSocket(socket);
});
