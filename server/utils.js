'use strict';

function required(object, properties) {
  properties.forEach(function(property) {
    if (!object[property]) {
      throw new Error('Missing parameter ' + property);
    }
  });
}

function sendError(res, code, errno, error, message, info) {
  var errmap = {};
  if (code) {
    errmap.code = code;
  }
  if (errno) {
    errmap.errno = errno;
  }
  if (error) {
    errmap.error = error;
  }
  if (message) {
    errmap.message = message;
  }
  if (info) {
    errmap.info = info;
  }

  res.errno = errno;
  console.log(errmap);
  res.status(code).json(errmap);
}

module.exports = {
  required  : required,
  sendError : sendError
};
