'use strict';

var BoxConnection   = require('./boxconnect').BoxConnection;
var Boxes           = require('./api/boxes');
var errors          = require('./errno.json');
var fxa             = require('./fxa');
var MessageHandler  = require('./messagehandler').MessageHandler;
var utils           = require('./utils');

module.exports = (function() {

  /** Helpers **/

  function initiateBoxConnection(boxId) {
    var connection = new BoxConnection(boxId);
    return connection.initiate();
  };

  /** MessageHandler **/

  function ClientMessageHandler(ws) {
    MessageHandler.call(this, ws);
  };

  ClientMessageHandler.prototype = {
    __proto__: MessageHandler.prototype,

    onhello: function(msg) {
      try{
        utils.required(msg, [
          'authorization',
          'iceCandidate',
          'webrtcOffer'
        ]);
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
          // XXX remove private box info before send
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
      }, function(error) {
        self.error(errors.BOX_CONNECTION_ERROR, error);
      });
    },

  };

  /** API **/

  return function(ws, req) {
    var handler = new ClientMessageHandler(ws);

    ws.on('message', handler.dispatch.bind(handler));

    ws.on('close', function() {
      handler = null;
    });
  };
})();
