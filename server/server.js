'use strict';

var auth        = require('./auth.js');
var bodyParser  = require('body-parser');
var boxes       = require('./routes/boxes');
var boxconnect  = require('./boxconnect');
var connect     = require('./connect');
var config      = require('./config').conf;
var express     = require('express');
var morgan      = require('morgan');
var users       = require('./routes/users');

var app         = module.exports.app = exports.app = express();

require('express-ws')(app);

// Body parser.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// CORS.
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers',
             'Origin, X-Requested-With, Content-Type, Accept');
             next();
});

// Logger.
app.use(morgan('combined'));

// Routes.
app.get('/', function(req, res) {
  res.type('text/plain');
  res.send('It works!');
});

// Routes - Boxes.
app.post('/boxes/', auth, boxes.create);
app.get('/boxes/', auth, boxes.get);
app.delete('/boxes/:id/', auth, boxes.delete);

// Routes - Users.
app.post('/boxes/:id/users/', auth, users.create);
app.get('/boxes/:id/users/', auth, users.get);
app.put('/boxes/:id/users/:email/', auth, users.update);
app.delete('/boxes/:id/users/:email/', auth, users.delete);

// Connection endpoints (WebSockets).
app.ws(config.get('wsConnectEndpoint'), connect);
app.ws(config.get('wsBoxesConnectEndpoint'), boxconnect.onConnectionRequest);

// XXX test push notifications
app.put('/', function(req, res) {
  console.log('PUSH notification received', req.body);
  res.sendStatus(200);
});

if (process.env.NODE_ENV === 'test') {
  // Firefox Accounts mock server.
  var fxaMock     = require('../tests/fxa.mock.server');
  app.post('/fxa/verify', fxaMock.verify);
  app.get('/fxa/profile/email', fxaMock.getProfile);
}

app.listen(3000);
