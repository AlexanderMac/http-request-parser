'use strict';

const _ = require('lodash');

exports.splitIntoTwoParts = (str, delimiter) => {
  if (_.isEmpty(str)) {
    return;
  }

  let delimiterIndex = str.indexOf(delimiter);
  if (delimiterIndex === -1) {
    return;
  }

  let res = [str.slice(0, delimiterIndex), str.slice(delimiterIndex + delimiter.length)];
  res[0] = _.trim(res[0]);
  res[1] = _.trim(res[1]);
  if (res[0].length === 0 || res[1].length === 0) {
    return;
  }

  return res;
};
