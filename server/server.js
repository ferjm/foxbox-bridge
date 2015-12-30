'use strict';

var bodyParser  = require('body-parser');
var boxes       = require('../routes/boxes.js');
var connections = require('../routes/connections.js');
var express     = require('express');
var morgan      = require('morgan');
var users       = require('../routes/users.js');

module.exports = (function() {
  var app = express();

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
  app.post('/boxes/', boxes.create);
  app.get('/boxes/', boxes.get);
  app.delete('/boxes/:id', boxes.delete);

  // Routes - Users.
  app.post('/boxes/:id/users/', users.create);
  app.get('/boxes/:id/users/', users.get);
  app.put('/boxes/:id/users/:email/', users.update);
  app.delete('/boxes/:id/users/:email/', users.delete);

  // Routes - Connections.
  app.post('/boxes/:id/connections/', connections.create);
  app.get('/boxes/:id/connections/', connections.get);
  app.get('/boxes/connections/:token/', connections.initiate);
  app.delete('/boxes/connection/:token/', connections.delete);

  function run() {
    app.listen(3000);
  }

  return {
    run: run
  };
})();
