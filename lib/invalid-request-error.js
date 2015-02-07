/*
 * http-request-parser
 * Copyright(c) 2014-2015 AlexanderMac <amatsibarov@gmail.com>
 * MIT Licensed
 */

var _s = require('underscore.string');

function InvalidRequestError(message, data) {
  if (message) {
    this.message = data ? 
    _s.sprintf('Invalid request message. %s. Data: %s', message, data) :
    _s.sprintf('Invalid request message. %s', message);
  } else {
    this.message = 'Invalid request message.'; 
  }
}

module.exports = InvalidRequestError;
