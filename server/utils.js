'use strict';

var ServerError = require('./errors').ServerError;

function logMapElements(value, key, map) {
  console.log('m[' + key + '] = ' + value);
}

function required(object, properties) {
  properties.forEach(function(property) {
    if (!object[property]) {
      throw new Error('Missing parameter ' + property);
    }
  });
}

function sendError(res, errno, message) {
  res.errno = errno;
  var error = new ServerError(errno, message);
  console.log(error);
  res.status(error.code).json(error);
}

module.exports = {
  logMapElements  : logMapElements,
  required        : required,
  sendError       : sendError
};
