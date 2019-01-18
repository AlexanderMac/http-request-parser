'use strict';

class InvalidMessageError extends Error {
  constructor(message, data) {
    super(message);
    this.message = data ?
      `Invalid request message. ${message}. Data: ${data}` :
      `Invalid request message. ${message}`;
  }
}

module.exports = InvalidMessageError;
