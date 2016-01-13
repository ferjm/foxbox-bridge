'use strict';

var errors    = require('../errno.json');
var utils     = require('../utils');
var validator = require('validator');

// XXX for now we keep the boxes registrations in memory
var boxes = new Map();
var users = new Map();

var ID_SEPARATOR = ',';

function getBoxId(owner, label) {
  if (!owner || !label) {
    throw new Error('Missing parameter');
  }

  if (label.indexOf(ID_SEPARATOR) > -1) {
    throw new Error('Invalid label character: "' + ID_SEPARATOR + '"');
  }

  return btoa(owner + ID_SEPARATOR + label);
}

function addBoxToUser(user, boxId) {
  if (users.has(user)) {
    users.set(user, users.get(user).push(boxId));
  } else {
    users.set(user, [boxId]);
  }
}

/**
 * Registers a box with the bridge.
 *
 * @param {Object} box The box to be registered.
 * @param {String} box.label The human readable identifier of the box.
 * @param {String} box.owner Email of the box owner.
 * @param {String} box.pushEndpoint Box side generated push endpoint used to notify
 *                              about remote connection requests.
 * @param {Array of String} box.users (optional) List of users allowed to use
 *                                    the box.
 */
exports.create = function(box) {
  return new Promise(function(resolve, reject) {
    try {
      utils.required(box, ['label', 'owner', 'pushEndpoint']);
      box.id = getBoxId(box.owner, box.label);
    } catch(e) {
      return reject(errors.MISSING_PARAMETER);
    }

    if (boxes.has(box.id)) {
      return reject(errors.ALREADY_REGISTERED);
    }

    boxes.set(box.id, box);

    if (!validator.isEmail(box.owner)) {
      return reject(errors.INVALID_OWNER);
    }

    if (!validator.isURL(box.pushEndpoint, { protocols: ['https'] })) {
      return reject(errors.INVALID_PUSH_ENDPOINT);
    }

    if (!validator.isAlphanumeric(box.label)) {
      return reject(errors.INVALID_LABEL);
    }

    addBoxToUser(box.owner, box.id);

    if (box.users) {
      if (!Array.isArray(box.users)) {
        box.users = [box.users];
      }

      box.users.forEach(function(user) {
        addBoxToUser(user, box.id);
      });
    }

    resolve(id);
  });
};

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
