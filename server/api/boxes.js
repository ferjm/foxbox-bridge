'use strict';

// XXX for now we keep the boxes registrations in memory

var boxes = new Map();

exports.create = function() {};

/**
 * filter: {
 *  id <optional>
 *  user <optional>
 *  label <optional>
 * }
 */
exports.get = function(filter) {
  // XXX test
  return Promise.resolve({
    id: Date.now(),
    user: 'fmoreno@mozilla.com',
    owner: 'fmoreno@mozilla.com',
    label: 'home',
    pushEndpoint: 'http://localhost:3000/'
  });
};

exports.update = function() {};

exports.delete = function() {};
