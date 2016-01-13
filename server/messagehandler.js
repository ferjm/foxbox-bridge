'use strict';

module.exports = (function() {

  // From ws module. WebSockets.OPEN
  var OPEN = 1;

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
      if (this.ws.readyState != OPEN) {
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
    }
  }

  return {
    MessageHandler: MessageHandler
  }
})();
