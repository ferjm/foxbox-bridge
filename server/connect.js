'use strict';

var BoxConnection = require('./boxconnect').BoxConnection;
var Boxes         = require('./api/boxes');
var errors        = require('./errno.json');
var fxa           = require('./fxa');
var utils         = require('./utils');

module.exports = (function() {

  // From ws module. WebSockets.OPEN
  var OPEN = 1;

  /** Helpers **/

  function initiateBoxConnection(boxId) {
    var connection = new BoxConnection(boxId);
    return connection.initiate();
  };

  /** MessageHandler **/

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
        utils.required(msg, ['authorization', 'webrtcOffer', 'iceCandidate']);
      } catch(e) {
        return this.error(errors.MISSING_PARAMETER, e.message);
      }

      var self = this;

      fxa.verify(msg.authorization).then(function(user) {
        // XXX find box for the user. Offer choices if many are found.
        return Boxes.get({
          id: msg.id,
          user: msg.user,
          label: msg.label
        });
      }, function() {
        self.error(errors.INVALID_AUTH_TOKEN);
      }).then(function(box) {
        // If there are multiple boxes associated to this user
        if (Array.isArray(box)) {
          this.response({
            type: 'select',
            boxes: box
          });
          return;
        }
        return initiateBoxConnection(box);
      }, function(error) {
        self.error(errors.UNKNOWN_BOX, error);
      }).then(function(connection) {
        if (!connection) {
          return;
        }
        self.response({
          type: 'hello',
          boxLabel: label,
          webrtcAnswer: connection.answer,
          iceCandidate: connection.iceCandidate
        });
      }, then(function(error) {
        self.error(errors.BOX_CONNECTION_ERROR, error);
      }));
    },

  };

  /** API **/

  return function(ws, req) {
    // XXX For now sessions are kept in memory.
    var handler = new MessageHandler(ws);

    ws.on('message', handler.dispatch.bind(handler));

    ws.on('close', function() {
      handler = null;
    });
  };
})();
