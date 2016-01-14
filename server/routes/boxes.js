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
  api.get({ user: req.user }).then(function(boxes) {
    res.sendStatus(200, {
      boxes: boxes
    });
  }).catch(function(error) {
    utils.sendError(res, error);
  });
};

exports.delete = function(req, res) {
  res.sendStatus(200);
};
