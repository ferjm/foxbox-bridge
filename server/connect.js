'use strict';

var errors      = require('./errno.json');

module.exports = (function() {

  function required(object, properties) {
    properties.forEach(function(property) {
      if (!object.property) {
        throw new Error('Missing parameter ' + property);
      }
    });
  }

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
      this.ws.send(JSON.stringify({
        type: 'error',
        errno: errno,
        error: error
      }));
      if (!keepOpen) {
        this.ws.close();
      }
    },

    onhello: function(msg) {
      try{
        required(msg, ['authorization']);
      } catch(e) {
        this.error(errors.MISSING_PARAMETER, e.message);
        return;
      }
    },

  };

  return function(ws, req) {
    // XXX For now sessions are kept in memory.
    var handler = new MessageHandler(ws);

    ws.on('message', handler.dispatch.bind(handler));

    ws.on('close', function() {
      handler = null;
    });
  };
})();
