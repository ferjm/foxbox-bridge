'use strict';

var errors  = require('../server/errors').errno;
var fs      = require('fs');
var utils   = require('../server/utils');

module.exports = (function() {
  var tmpFile = '/tmp/fxa';

  function doResponse(res, method) {
    fs.readFile(tmpFile, 'utf8', function(err, response) {
      try {
        response = JSON.parse(response);
      } catch(e) {
        utils.sendError(res, errors.UNDEFINED);
        return;
      }

      if (!response || !response[method]) {
        utils.sendError(res, errors.UNDEFINED);
        return;
      }

      res.status(response[method].status).json(response[method].body);
    });
  }

  var verify = function(req, res) {
    doResponse(res, 'verify');
  };

  var getProfile = function(req, res) {
    doResponse(res, 'getProfile');
  };

  var reset = function() {
    fs.unlink(tmpFile);
  };

  var response = function(res) {
    if (!res) res = {};
    fs.writeFile(tmpFile, JSON.stringify({
      verify: res.verify || {
        status: 200,
        body: {
          user: 'user',
          client_id: 'client_id',
          scope: ['profile']
        },
      },
      getProfile: res.getProfile || {
        status: 200,
        body: {
        email: 'user@domain.com'
        }
      }
    }));
  };

  return {
    getProfile: getProfile,
    reset: reset,
    response: response,
    verify: verify
  };

})();
