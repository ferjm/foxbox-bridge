'use strict';

var Boxes   = require('./api/boxes');
var fxa     = require('./fxa');
var Promise = require('promise');
var utils   = require('./utils');

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
    this.version = Date.now();
    this.deferred = {};
    this.deferred.promise = new Promise((function(resolve, reject) {
      this.deferred.resolve = resolve;
      this.deferred.reject = reject;
    }).bind(this));
    connections.set(this.version, this);
  }

  BoxConnection.prototype = {
    initiate: function() {
      request.put({
        url: this.box.pushEndpoint,
        form: { version: this.version }
      }, function(err) {
        if (err) {
          this.deferred.reject('Push notification error: ' + err);
        }
      });
      return this.deferred.promise;
    },

    cancel: function(reason) {
      if (!connections.has(this.version)) {
        return;
      }
      connections.delete(this.version);
      this.deferred.reject(reason);
    },

    complete: function(iceCandidate, webrtcOffer) {
      if (!connections.has(this.version)) {
        return;
      }
      connections.delete(this.version);
      this.deferred.resolve({
        iceCandidate: iceCandidate,
        webrtcAnswer: webrtcAnswer
      });
    }
  };

  /** Message handler **/

  function MessageHandler(ws) {
    this.ws = ws;
  };

  MessageHandler.prototype = {
    dispatch: function(msg) {
      try {
        msg = JSON.parse(msg);
      } catch(e) {
        this.error(errors.BAD_REQUEST, 'Bad request');
        return;
      }

      if (!msg.type || !this['on' + msg.type]) {
        this.error(errors.INVALID_MESSAGE_TYPE, 'Invalid message type');
        return;
      }

      this['on' + msg.type](msg);
    },

    error: function(errno, error, keepOpen) {
      if (this.ws.readyState != WebSocket.OPEN) {
        return;
      }

      this.ws.send(JSON.stringify({
        type: 'error',
        errno: errno,
        error: error
      }));
      if (!keepOpen) {
        this.ws.close();
      }
    },

    response: function(msg, close) {
      if (this.ws.readyState != OPEN) {
        return;
      }

      try {
        this.ws.send(JSON.stringify(msg));
      } catch(e) {
        console.error('Could not send response', e);
      }
      if (close) {
        this.ws.close();
      }
    },

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

      fxa.verify(msg.authorization).then(function(user) {
        if (!connections.has(msg.version)) {
          return self.error(errors.EXPIRED_BOX_CONNECTION);
        }
        connection = connections.get(msg.version);
        if (connection.box.owner != user) {
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
    var handler = new MessageHandler(ws);

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
