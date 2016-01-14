'use strict';

var api     = require('../api/boxes');
var errors  = require('../errors').errno;
var utils   = require('../utils');

exports.create = function(req, res) {
  var box = req.body;
  box.owner = req.user;
  api.create(box).then(function(id) {
    res.status(200).json({
      id: id
    });
  }).catch(function(error) {
    utils.sendError(res, error);
  });
};

exports.get = function(req, res) {
  api.get({ user: req.user }).then(function(boxes) {
    res.status(200).json({
      boxes: boxes
    });
  }).catch(function(error) {
    utils.sendError(res, error);
  });
};

exports.delete = function(req, res) {
  api.delete(req.user, req.params.id).then(function() {
    res.sendStatus(200);
  }).catch(function(error) {
    utils.sendError(res, error);
  });
};
