'use strict';

module.exports = (function() {

  var errors = {
    MISSING_PARAMETER: {
      code: 400,
      errno: 100,
      error: 'Missing parameter'
    },
    INVALID_PUSH_ENDPOINT: {
      code: 400,
      errno: 101,
      error: 'Invalid push endpoint'
    },
    INVALID_LABEL: {
      code: 400,
      errno: 102,
      error: 'Invalid label'
    },
    INVALID_USERS: {
      code: 400,
      errno: 103,
      error: 'Invalid users'
    },
    INVALID_OWNER: {
      code: 400,
      errno: 104,
      error: 'Invalid owner'
    },
    INVALID_FILTER: {
      code: 400,
      errno: 105,
      error: 'Invalid filter'
    },
    INVALID_ID: {
      code: 400,
      errno: 106,
      error: 'Invalid ID'
    },
    INVALID_AUTH_TOKEN: {
      code: 401,
      errno: 401,
      error: 'Unauthorized'
    },
    ALREADY_REGISTERED: {
      code: 409,
      errno: 409,
      error: 'Already registered'
    },
    INVALID_MESSAGE_TYPE: {
      code: 400,
      errno: 601,
      error: 'Invalid error type'
    },
    BAD_REQUEST: {
      code: 400,
      errno: 400,
      error: 'Bad request'
    },
    UNKNOWN_BOX: {
      code: 404,
      errno: 404,
      error: 'Unknown box'
    },
    EXPIRED_BOX_CONNECTION: {
      code: 410,
      errno: 410,
      error: 'Expired box connection'
    },
    BOX_CONNECTION_ERROR: {
      code: 502,
      errno: 502,
      error: 'Box connection error'
    },
    UNDEFINED: {
      code: 500,
      errno: 999,
      error: 'Unknown error'
    }
  };

  var errno = [];
  Object.keys(errors).forEach(function(error) {
    errno[error] = error;
  });

  function ServerError(errno, message) {
    if (!errors[errno]) {
      errno = errno.UNDEFINED;
    }

    this.code = errors[errno].code;
    this.errno = errors[errno].errno;
    this.error = errors[errno].error;
    if (message) {
      this.message = message;
    }
  }

  return {
    errno: errno,
    errors: errors,
    ServerError: ServerError
  };
})();
