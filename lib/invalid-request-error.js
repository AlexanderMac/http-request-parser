'use strict';

function InvalidRequestError(message, data) {
  if (message) {
    this.message = data ?
      `Invalid request message. ${message}. Data: ${data}` :
      `Invalid request message. ${message}`;
  } else {
    this.message = 'Invalid request message.';
  }
}

module.exports = InvalidRequestError;
