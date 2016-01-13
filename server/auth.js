'use strict';

var errors      = require('./errno.json');
var fxa         = require('./fxa');
var sendError   = require('./utils').sendError;

module.exports = (function(req, res, next) {

  function unauthorized(res, message) {
    sendError(res, 401, errors.INVALID_AUTH_TOKEN, message || 'Unauthorized');
  }

  return function(req, res, next) {
    var authorization = req.headers.authorization;

    if (authorization === undefined) {
      unauthorized(res);
      return;
    }

    var split = authorization.split(" ");
    if (split.length !== 2) {
      unauthorized(res);
      return;
    }

    var policy = split[0];
    if (policy.toLowerCase() !== 'bearer') {
      unauthorized(res, null, 'Unsupported');
      return;
    }

    var token = split[1];
    fxa.verify(token).then(function() {
      return fxa.getProfile(token);
    }).then(function(profile) {
      req.user = profile.email;
      next();
    }).catch(function(error) {
      unauthorized(res, error);
    });
  };

})();
