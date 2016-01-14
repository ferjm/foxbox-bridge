'use strict';

var api     = require('../api/boxes');
var errors  = require('../errors').errno;
var utils   = require('../utils');

exports.create = function(req, res) {
  var box = req.body;
  box.owner = req.user;
  api.create(box).then(function(id) {
    res.sendStatus(200, {
      id: id
    });
  }).catch(function(error) {
    utils.sendError(res, error);
  });
};

exports.get = function(req, res) {
  res.sendStatus(200);
};

exports.delete = function(req, res) {
  res.sendStatus(200);
};
