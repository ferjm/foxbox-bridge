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

function removeBoxFromUser(user, boxId) {
  var boxes = users.get(user);
  users.set(boxes.filter(function(box) {
    return box.id != boxId;
  }));
}

function getBoxById(boxId) {
  return new Promise(function(resolve) {
    resolve(boxes.get(boxId));
  });
}

function getBoxByUser(user) {
  return new Promise(function(resolve) {
    resolve(users.get(user));
  });
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
 * Gets a box or list of boxes that match a given search filter.
 *
 * @param {Object} filter Search filter.
 * @param {String} filter.id (optional) Box id.
 * @param {String} filter.user (optional) Box user email.
 *                             Can be owner or allowed user.
 * @param {String} filter.label (optional) Box label.
 *                             Label only searches won't be done.
 */
exports.get = function(filter) {
  if (!filter || (!filter.id && !filter.user)) {
    return Promise.reject(errors.INVALID_FILTER);
  }

  if (!filter.id && filter.user && filter.label) {
    filter.id = getBoxById(filter.user, filter.label);
  }

  if (filter.id) {
    return getBoxById(filter.id).then(function(result) {
      if (result) {
        return result;
      }
      if (filter.user) {
        return getBoxByUser(filter.user);
      }
    });
  }

  if (filter.user) {
    return getBoxByUser(filter.user);
  }
};

exports.update = function() {};

exports.delete = function(boxId) {
  return new Promise(function(resolve, reject) {
    if (!boxes.has(boxId)) {
      return reject(errors.UNKNOWN_BOX);
    }
    var box = boxes.get(boxId);
    boxes.delete(boxId);

    removeBoxFromUser(box.owner, boxId);

    box.users.forEach(function(user) {
      removeBoxFromUser(user, boxId);
    });
  });
};
