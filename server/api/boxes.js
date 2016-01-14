'use strict';

var btoa      = require('btoa');
var errors    = require('../errors').errno;
var utils     = require('../utils');
var validator = require('validator');

// XXX for now we keep the boxes registrations in memory
var boxes = new Map();
var users = new Map();

var ID_SEPARATOR = ',';

function getBoxId(owner, label) {
  if (!owner || !label) {
    throw new Error(errors.MISSING_PARAMETER);
  }

  if (label.indexOf(ID_SEPARATOR) > -1) {
    throw new Error(errors.INVALID_LABEL);
  }

  return btoa(owner + ID_SEPARATOR + label);
}

function addBoxToUser(user, boxId) {
  if (users.has(user)) {
    var boxes = users.get(user);
    boxes.push(boxId);
    users.set(user, boxes);
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
  return Promise.resolve(boxes.get(boxId));
}

function getBoxesByUser(user) {
  if (!users.has(user)) {
    return Promise.resolve([]);
  }

  var promises = [];
  users.get(user).forEach(function(id) {
    promises.push(getBoxById(id));
  });
  return Promise.all(promises);
}

function validateBox(box) {
  if (!validator.isEmail(box.owner)) {
    throw new Error(errors.INVALID_OWNER);
  }

  if (!validator.isURL(box.pushEndpoint, { protocols: ['https'] })) {
    throw new Error(errors.INVALID_PUSH_ENDPOINT);
  }

  if (!validator.isAlphanumeric(box.label)) {
    throw new Error(errors.INVALID_LABEL);
  }

  if (box.users) {
    if (!Array.isArray(box.users)) {
      box.users = [box.users];
    }

    box.users.forEach(function(user) {
      if (!validator.isEmail(user)) {
        throw new Error(errors.INVALID_USERS);
      }
    });
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
 * @return {Promise}
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

    try {
      validateBox(box);
    } catch(e) {
      return reject(e.message);
    }

    boxes.set(box.id, box);

    addBoxToUser(box.owner, box.id);

    if (box.users) {
      if (!Array.isArray(box.users)) {
        box.users = [box.users];
      }

      box.users.forEach(function(user) {
        addBoxToUser(user, box.id);
      });
    }

    resolve(box.id);
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
 * @return {Promise}
 */
exports.get = function(filter) {
  if (!filter || (!filter.id && !filter.user)) {
    return Promise.reject(errors.INVALID_FILTER);
  }

  if (!filter.id && filter.user && filter.label) {
    filter.id = getBoxId(filter.user, filter.label);
  }

  if (filter.id) {
    return getBoxById(filter.id).then(function(result) {
      if (result) {
        return result;
      }
      if (filter.user) {
        return getBoxesByUser(filter.user);
      }
    });
  }

  if (filter.user) {
    return getBoxesByUser(filter.user);
  }
};

/**
 * Updates a box registration.
 *
 * @param {Object} box The box to be updated.
 * @param {String} box.id Box identifier.
 * @param {String} box.label The human readable identifier of the box.
 * @param {String} box.owner Email of the box owner.
 * @param {String} box.pushEndpoint Box side generated push endpoint used to notify
 *                              about remote connection requests.
 * @param {Array of String} box.users (optional) List of users allowed to use
 *                                    the box.
 * @return Promise
 */
exports.update = function(box) {
  try {
    validateBox(box);
  } catch(e) {
    return Promise.reject(e.message);
  }

  boxes.delete(box.id);
  boxes.set(box.id, box);
  return Promise.resolve();
};

/**
 * Deletes a box given its id.
 *
 * @param {String} boxId Box identifier.
 * @return {Promise}
 */
exports.delete = function(boxId) {
  if (!validator.isAlphanumeric(boxId)) {
    return Promise.reject(errors.INVALID_ID);
  }

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
