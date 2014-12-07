/*
 * http-request-parser
 * Copyright(c) 2014 AlexanderMac <amatsibarov@gmail.com>
 * MIT Licensed
 */

var _ = require('lodash');
var strUtil = require('./string-util');
var httpNames = require('../resources/http-names');

var boundaryRegexp = /boundary=-*\w+/im;
var paramRegexp = /Content-Disposition:\s*form-data;\s*name="\w+"/im;
var paramNameRegexp = /name="\w+"/im;
var quotRegexp = /"/g;

function HttpRequestParser() { }

HttpRequestParser.prototype.parse = function(request) {
  if (!request) {
    throw Strings.RequestIsRequired;
  }

  var requestRows = parseRequestForRows(request);
  var head = parseHeadRow(requestRows.head);
  var host = parseHostRow(requestRows.host);
  var headers = parseHeadersRows(requestRows.headers);
  var cookies = parseCookiesRow(requestRows.cookies);
  var body = parseBody(requestRows.body, headers);

  return {
    head: head,
    host: host,
    headers: headers,
    cookies: cookies,
    body: body
  };
}

function parseRequestForRows(request) {
  var headersAndBody = strUtil.splitStringForTwoParts(request, '\n\n');
  var headersRows = headersAndBody[0].split('\n');
  if (headersRows.length == 0) {
    throw 'Invalid request. No headers';
  }
  var bodyRows = headersAndBody[1];

  var cookiesIndex = _.findIndex(headersRows, function (row) {
    return row.startsWith('Cookie:');
  });
  var cookiesRow = null;
  if (cookiesIndex != -1) {
    cookiesRow = headersRows[cookiesIndex];
    headersRows.splice(cookiesIndex, 1);
  }

  return {
    head: headersRows[0],
    host: headersRows[1],
    headers: headersRows.splice(2),
    cookies: cookiesRow,
    body: bodyRows
  };
}

function parseHeadRow(row) {
  var parts = strUtil.splitString(row, ' ', 3);
  var protocolAndUrl = strUtil.splitStringForTwoParts(parts[1], '://');

  return {
    method: parts[0].toUpperCase(),
    protocol: protocolAndUrl[0].toUpperCase(),
    url: protocolAndUrl[1].toLowerCase(),
    protocolVersion: parts[2].toUpperCase()
  };
}

function parseHostRow(row) {
  var parts = strUtil.splitStringForTwoParts(row, ':');
  return parts[1];
}

function parseHeadersRows(rows) {
  return _.map(rows, function (row) {
    var parts = strUtil.splitStringForTwoParts(row, ':');
    var headerName = parts[0];
    var valuesParts = strUtil.splitString(parts[1], ',');
    var values = _.map(valuesParts, function (valuePart) {
      var valueAndParams = strUtil.splitStringForOneOrTwoParts(valuePart, ';');
      return {
        value: valueAndParams[0],
        params: valueAndParams.length > 1 ? valueAndParams[1] : null
      };
    });
    return {
      name: headerName,
      values: values
    };
  });
}

function parseCookiesRow(row) {
  if (!row) {
    return null;
  }

  var temp = strUtil.splitStringForTwoParts(row, ':');
  var cookies = strUtil.splitString(temp[1], ';');

  return _(cookies)
    .map(function (cookie) {
      var cookieAndValue = strUtil.splitStringForOneOrTwoParts(cookie, '=');
      return !cookieAndValue[0]
        ? null
        : {
          name: cookieAndValue[0],
          value: cookieAndValue.length > 1 ? cookieAndValue[1] : null
        };
    })
    .compact()
    .value();
}

function parseBody(rows, headers) {
  var body = {};

  if (!rows) {
    body.hasBody = false;
    return body;
  } else {
    body.hasBody = true;
  }

  var contentTypeHeader = getContentTypeAndBoundary(headers);
  if (!contentTypeHeader) {
    body.plain = rows;
    return body;
  } else {
    body.contentType = contentTypeHeader.contentType;
    body.boundary = contentTypeHeader.boundary;
  }

  switch (contentTypeHeader.contentType) {
    case httpNames.contentTypes.formData:
      if (contentTypeHeader.boundary) {
        parseFormDataBody(rows, body);
      } else {
        throw 'For contentType=FormData is not defined boundary';
      }
      break;

    case httpNames.contentTypes.xWwwFormUrlencoded:
      parsexWwwFormUrlencodedBody(rows, body);
      break;

    default:
      parsePlainBody(rows, body);
      break;
  }

  return body;
}

function getContentTypeAndBoundary(headers) {
  var contentTypeHeader = _.find(headers, { name: httpNames.headers.contentTypeHeader });
  if (!contentTypeHeader) {
    return null;
  }

  var contentTypeValue = (contentTypeHeader.values && contentTypeHeader.values.length > 0)
    ? contentTypeHeader.values[0]
    : null;
  if (contentTypeValue) {
    var boundaryMatch = strUtil.getFirstMatch(boundaryRegexp, contentTypeValue.params);
    var boundary = boundaryMatch
      ? strUtil.splitStringForOneOrTwoParts(boundaryMatch, '=')[1]
      : null;
    return {
      contentType: contentTypeValue.value,
      boundary: boundary
    };
  }

  return null;
}

function parseFormDataBody(rows, body) {
  var params = strUtil.splitString(rows, '--' + body.boundary);
  body.formDataParams = _(params)
    .map(function (param) {
      var paramName = null;
      var paramValue = null;
      var paramMatch = strUtil.getFirstMatchAndLeftText(paramRegexp, param);
      if (paramMatch) {
        var paramNameMatch = strUtil.getFirstMatch(paramNameRegexp, paramMatch.match);
        if (paramNameMatch) {
          paramName = strUtil.splitStringForOneOrTwoParts(paramNameMatch, '=')[1];
        }
        paramValue = paramMatch.leftText;
      }
      return !paramName
        ? null
        : {
          name: paramName.replace(quotRegexp, ''),
          value: paramValue
        };
    })
    .compact()
    .value();
}

function parsexWwwFormUrlencodedBody(rows, body) {
  var params = strUtil.splitString(rows, '&');
  body.formDataParams = _(params)
    .map(function (param) {
      var paramValue = strUtil.splitStringForOneOrTwoParts(param, '=');
      return !paramValue[0]
        ? null
        : {
          name: paramValue[0],
          value: paramValue.length > 1 ? paramValue[1] : null
        };
    })
    .compact()
    .value();
}

function parsePlainBody(rows, body) {
  body.plain = rows;
}

var hrp = new HttpRequestParser();
hrp.HttpRequestParser = HttpRequestParser;

module.exports = hrp;
