/*
 * http-request-parser
 * Copyright(c) 2014 AlexanderMac <amatsibarov@gmail.com>
 * MIT Licensed
 */

var _ = require('lodash');

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str) {
    return this.indexOf(str) == 0;
  };
}

function StringsUtil() { }

StringsUtil.prototype.trimStrings = function (strings) {
  return _.map(strings, function (str) {
    return str.trim();
  });
}

StringsUtil.prototype.splitString = function (str, separator, requiredLength) {
  if (str == null) {
    throw 'Can\'t split string. String is not defined';
  }
  var parts = str.split(separator);
  if (requiredLength && parts.length != requiredLength) {
    throw 'Can\'t split string. String is not contains ' + requiredLength + ' parts.<br/>String: ' + str;
  }
  return this.trimStrings(parts);
}

StringsUtil.prototype.splitStringForTwoParts = function (str, separator) {
  if (str == null) {
    throw 'Can\'t split string for 2 parts. String is not defined';
  }
  var indexOfSeparator = str.indexOf(separator);
  if (indexOfSeparator == -1) {
    throw 'Can\'t split string for 2 parts. String is not contains 2 parts.<br/>String: ' + str;
  }
  return [
    str.substr(0, indexOfSeparator).trim(),
    str.substr(indexOfSeparator + separator.length).trim()
  ];
}

StringsUtil.prototype.splitStringForOneOrTwoParts = function (str, separator) {
  if (str == null) {
    throw 'Can\'t split string for 1 or 2 parts. String is not defined';
  }
  var indexOfSeparator = str.indexOf(separator);
  if (indexOfSeparator == -1) {
    return [str.trim()];
  }
  return [
    str.substr(0, indexOfSeparator).trim(),
    str.substr(indexOfSeparator + separator.length).trim()
  ];
}

StringsUtil.prototype.getFirstMatch = function(regexp, text) {
  var match = regexp.exec(text);
  if (match && match.length > 0) {
    return match[0];
  }
  return null;
}

StringsUtil.prototype.getFirstMatchAndLeftText = function (regexp, text) {
  var match = self.getFirstMatch(regexp, text);
  if (match) {
    return {
      match: match,
      leftText: text.replace(match, '').trim('\n')
    };
  }
  return null;
}

var util = new StringsUtil();

module.exports = util;
