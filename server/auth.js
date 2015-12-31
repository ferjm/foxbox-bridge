'use strict';

var config      = require('./config').conf;
var errors      = require('./errno.json');
var Promise     = require('promise');
var request     = require('request');
var sendError   = require('./utils').sendError;

module.exports = (function(req, res, next) {

  function unauthorized(res, message) {
    sendError(res, 401, errors.INVALID_AUTH_TOKEN, message || 'Unauthorized');
  }

  function getProfile(req, res, token) {
    return new Promise(function(resolve, reject) {
      request.get({
        uri: config.get('fxaProfile'),
        headers: {
          'Authorization': 'Bearer ' + token
        }
      }, function(err, response, data) {
        if (err) {
          return unauthorized(res, err);
        }

        if (data.error) {
          return unauthorized(res, data.error);
        }

        if (!data.email) {
          return unauthorized(res, 'Could not retrieve user profile');
        }

        req.user = data.email;

        resolve();
      });
    });
  }

  function verify(req, res, token) {
    return new Promise(function(resolve, reject) {
      request.post({
        uri: config.get('fxaVerifier'),
        json: {
          token: token
        }
      }, function(err, response, data) {
        if (err) {
          return unauthorized(res, err);
        }

        if (data.error) {
          return unauthorized(res, data.error);
        }

        if (data.scope.indexOf('profile:email') === -1) {
          return unauthorized(res, 'Invalid scope');
        }

        resolve();
      });
    });
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
    verify(req, res, token).then(function() {
      return getProfile(req, res, token);
    }).then(next);
  };

})();
