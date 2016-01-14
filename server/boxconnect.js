'use strict';

var Boxes           = require('./api/boxes');
var errors          = require('./errors').errno;
var fxa             = require('./fxa');
var MessageHandler  = require('./messagehandler').MessageHandler;
var Promise         = require('promise');
var request         = require('request');
var utils           = require('./utils');

module.exports = (function() {

  // XXX set connection timers.

  // For now we keep connections in memory
  var connections = new Map();

  /** BoxConnection **/

  function BoxConnection(box) {
    if (!box) {
      throw new Error('Missing box');
    }
    this.box = box;
    this.version = Date.now() + '';
    this.deferred = {};
    this.deferred.promise = new Promise((function(resolve, reject) {
      this.deferred.resolve = resolve;
      this.deferred.reject = reject;
    }).bind(this));
  }

  BoxConnection.prototype = {
    initiate: function() {
      connections.set(this.version, this);
      request.put({
        url: this.box.pushEndpoint,
        form: { version: this.version }
      }, (function(err, data) {
        if (err) {
          this.deferred.reject('Push notification error: ' + err);
        }
      }).bind(this));
      return this.deferred.promise;
    },

    cancel: function(reason) {
      if (!connections.has(this.version)) {
        return;
      }
      connections.delete(this.version);
      this.deferred.reject(reason);
    },

    complete: function(result) {
      if (!connections.has(this.version)) {
        return;
      }
      connections.delete(this.version);
      this.deferred.resolve(result);
    }
  };

  /** Message handler **/

  function BoxMessageHandler(ws) {
    MessageHandler.call(this, ws);
  };

  BoxMessageHandler.prototype = {
    __proto__: MessageHandler.prototype,

    onhello: function(msg) {
      try{
        utils.required(msg, [
          'authorization',
          'iceCandidate',
          'version',
          'webrtcAnswer'
        ]);
      } catch(e) {
        return this.error(errors.MISSING_PARAMETER, e.message);
      }

      var self = this;
      var connection;

      fxa.verify(msg.authorization).then(function() {
        return fxa.getProfile(msg.authorization);
      }, function() {
        self.error(errors.INVALID_AUTH_TOKEN);
      }).then(function(user) {
        if (!connections.has(msg.version)) {
          return self.error(errors.EXPIRED_BOX_CONNECTION);
        }
        connection = connections.get(msg.version);
        if (connection.box.owner != user.email) {
          connection.cancel('Invalid box authentication');
          return self.error(errors.INVALID_AUTH_TOKEN);
        }
        connection.complete({
          iceCandidate: msg.iceCandidate,
          webrtcAnswer: msg.webrtcAnswer
        });
      }, function() {
        self.error(errors.INVALID_AUTH_TOKEN);
      });
    },
  }

  function onConnectionRequest(ws, req) {
    var handler = new BoxMessageHandler(ws);

    ws.on('message', handler.dispatch.bind(handler));

    ws.on('close', function() {
      handler = null;
    });
  }

  return {
    BoxConnection: BoxConnection,
    onConnectionRequest: onConnectionRequest
  };

})();
