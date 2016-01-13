'use strict';

var config      = require('./config').conf;
var Promise     = require('promise');
var request     = require('request');

module.exports = (function() {
  var verify = function(token) {
    return new Promise(function(resolve, reject) {
      request.post({
        uri: config.get('fxaVerifier'),
        json: {
          token: token
        }
      }, function(err, response, data) {
        if (err) {
          return reject(err);
        }

        try {
          data = JSON.parse(data);
        } catch(e) {}

        if (data.error) {
          return reject(data.error);
        }

        if (data.scope.indexOf('profile') === -1) {
          return reject('Invalid scope');
        }

        resolve();
      });
    });
  };

  var getProfile = function(token) {
    return new Promise(function(resolve, reject) {
      request.get({
        uri: config.get('fxaProfile') + '/email',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      }, function(err, response, data) {
        if (err) {
          return reject(rr);
        }

        try {
          data = JSON.parse(data);
        } catch(e) {}

        if (data.error) {
          return reject(data.error);
        }

        if (!data.email) {
          return reject('Could not retrieve user profile');
        }

        resolve(data);
      });
    });
  };

  return {
    verify: verify,
    getProfile: getProfile
  };
})();
