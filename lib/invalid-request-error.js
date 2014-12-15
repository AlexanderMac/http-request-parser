var _s = require('underscore.string');

function InvalidRequestError(message, data) {
  this.message = message;
  this.data = data;
}

InvalidRequestError.prototype.toString = function() {
  if (this.message) {
    if (this.data) {
      return _s.sprintf('Invalid request. %s. Data: %s.', 
                        this.message, this.data); 
    }
    return _s.sprintf('Invalid request. %s.', this.message); 
  }
  return 'Invalid request.'; 
};

module.exports = InvalidRequestError;