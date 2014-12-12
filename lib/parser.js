/*
 * http-request-parser
 * Copyright(c) 2014 AlexanderMac <amatsibarov@gmail.com>
 * MIT Licensed
 */

var _ = require('lodash');
var _s = require('underscore.string');
var httpConsts = require('../resources/http-consts');

var boundaryRegexp = /boundary=-*\w+/im;
var paramRegexp = /Content-Disposition:\s*form-data;\s*name="\w+"/im;
var paramNameRegexp = /name="\w+"/im;
var quotRegexp = /"/g;

function HttpRequestParser() { }

HttpRequestParser.prototype.parse = function(request) {
  if (!request) {
    throw 'Request must be not empty';
  }

  var requestRows = parseRequestForRows(request);
  
  var first = parseFirstRow(requestRows.first);
  var host = parseHostRow(requestRows.host);
  var headers = parseHeadersRows(requestRows.headers);
  var cookies = parseCookiesRow(requestRows.cookies);
  var body = parseBody(requestRows.body, headers);

  return {
    method: first.method,
    protocol: first.protocol,
    url: first.url,
    protocolVersion: first.protocolVersion,
    host: host,
    headers: headers,
    cookies: cookies,
    body: body
  };
}

function parseRequestForRows(request) {
  var headersAndBodySeparator = '\n\n';
  var headersAndBodySeparatorIndex = request.indexOf(headersAndBodySeparator);
  if (headersAndBodySeparatorIndex == -1) {
    throw 'Invalid request. Request must contains headers and body, separated by two break lines';
  }

  var headers = request.substr(0, headersAndBodySeparatorIndex);
  var body = request.substr(headersAndBodySeparatorIndex + headersAndBodySeparator.length);
  
  var headersRows = _s.lines(headers);
  if (headersRows.length == 0) {
    throw 'Invalid request. No headers';
  }

  var cookiesIndex = _.findIndex(headersRows, function (row) {
    return _s.startsWith(row, 'Cookie:');
  });
  var cookiesRow;
  if (cookiesIndex != -1) {
    cookiesRow = headersRows[cookiesIndex];
    headersRows.splice(cookiesIndex, 1);
  }

  return {
    first: headersRows[0],
    host: headersRows[1],
    headers: headersRows.splice(2),
    cookies: cookiesRow,
    body: body
  };
}

function parseFirstRow(row) {
  var methodUrlProtocolVer = _s.words(row, ' ');
  if (methodUrlProtocolVer.length != 3) {
    throw _s.sprintf('Invalid first row. It must have format: Method Url Protocol. Data: [%s]', row);
  }
  
  var protocolAndUrl = _s.words(methodUrlProtocolVer[1], '://');
  if (protocolAndUrl.length != 2) {
    throw _s.sprintf('Invalid header row. Url must have format: Protocol://Address. Data: [%s]', methodUrlProtocolVer[1]);
  }

  return {
    method: methodUrlProtocolVer[0].toUpperCase(),
    protocol: protocolAndUrl[0].toUpperCase(),
    url: protocolAndUrl[1].toLowerCase(),
    protocolVersion: methodUrlProtocolVer[2].toUpperCase()
  };
}

function parseHostRow(row) {
  var nameAndValue = _s.words(row, ':');
  if (nameAndValue.length != 2) {
    throw _s.sprintf('Invalid host row. It must have format: Host: Value. Data: [%s]', row);
  }
  
  return _s.trim(nameAndValue[1]);
}

function parseHeadersRows(rows) {
  return _.map(rows, function (row) {
    var nameAndValues = _s.words(row, ':');
    if (nameAndValues.length != 2) {
      throw _s.sprintf('Invalid header row. It must have format: HeaderName: HeaderValues. Data: [%s]', row);
    } 
    
    var headerName = _s.trim(nameAndValues[0]);
    var values = _s.words(nameAndValues[1], ',');
    var valuesAndParams = _.map(values, function (value) {
      var valueAndParams = _s.words(value, ';');
      if (valueAndParams.length == 0) {
        throw _s.sprintf('Invalid header row value. It must be not empty. Data: [%s]', value[1]);
      } 
      
      return {
        value: _s.trim(valueAndParams[0]),
        params: valueAndParams.length > 1 ? _s.trim(valueAndParams[1]) : null
      };
    });
    
    return {
      name: headerName,
      values: valuesAndParams
    };
  });
}

function parseCookiesRow(row) {
  if (!row) {
    return null;
  }

  var nameAndValues = _s.words(row, ':');
  if (nameAndValues.length != 2) {
    throw _s.sprintf('Invalid cookie row. It must have format: Cookie: Name1=Value1; Name2=Value2... Data: [%s]', row);
  } 
  
  var cookies = _s.words(nameAndValues[1], ';');

  return _(cookies)
    .map(function (cookie) {
      var cookieAndValue = _s.words(cookie, '=');
      return !cookieAndValue[0]
        ? null
        : {
          name: _s.trim(cookieAndValue[0]),
          value: cookieAndValue.length > 1 ? _s.trim(cookieAndValue[1]) : null
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
    case httpConsts.contentTypes.formData:
      if (contentTypeHeader.boundary) {
        parseFormDataBody(rows, body);
      } else {
        throw 'Invalid body. For body with ContentType=FormData must be a header with boundary';
      }
      break;

    case httpConsts.contentTypes.xWwwFormUrlencoded:
      parsexWwwFormUrlencodedBody(rows, body);
      break;

    default:
      parsePlainBody(rows, body);
      break;
  }

  return body;
}

function getContentTypeAndBoundary(headers) {
  var contentTypeHeader = _.find(headers, { name: httpConsts.headers.contentType });
  if (!contentTypeHeader) {
    return null;
  }

  var contentTypeValue = (contentTypeHeader.values && contentTypeHeader.values.length > 0)
    ? contentTypeHeader.values[0]
    : null;
  
  if (!contentTypeValue) {
    return null;
  }
  
  var boundary = null;
  if (contentTypeValue) {
    if (contentTypeValue.params) {
      var boundaryMatch = contentTypeValue.params.match(boundaryRegexp);
      if (boundaryMatch) {
        var boundaryNameAndValue = _s.words(boundaryMatch, '=');
        if (boundaryNameAndValue.length != 2) {
          throw _s.sprintf('Invalid boundary param. Must have format: boundary=value. Data: [%s]', boundaryMatch);
        }
        boundary = boundaryNameAndValue[1];
      }
    }
    
    return {
      contentType: contentTypeValue.value,
      boundary: boundary
    };
  }

  return null;
}

function parseFormDataBody(rows, body) {
  var params = _s.words(rows, '-----------------------' + body.boundary);
  
  body.formDataParams = _(params)
    .map(function (param) {
      var paramName = null;
      var paramValue = null;
      
      var paramMatch = param.match(paramRegexp);
      if (paramMatch) {
        var paramNameMatch = paramMatch.toString().match(paramNameRegexp); // TODO: refactor to remove toString
        if (paramNameMatch) {
          var paramNameParts = _s.words(paramNameMatch, '=');
          if (paramNameParts.length != 2) {
            throw _s.sprintf('Invalid paramName. Must have format: Name=Value. Data: [%s]', paramNameMatch);
          }
          paramName = paramNameParts[1];
        }
        paramValue = param.replace(paramMatch, '').trim('\n');
      }
      
      return !paramName
        ? null
        : {
          name: paramName.toString().replace(quotRegexp, ''), // TODO: refactor to remove toString
          value: paramValue
        };
    })
    .compact()
    .value();
}

function parsexWwwFormUrlencodedBody(rows, body) {
  var params = _s.words(rows, '&');
  
  body.formDataParams = _(params)
    .map(function (param) {
      var paramValue = _s.words(param, '=');
      if (paramValue.length != 1 && paramValue.length != 2) {
        throw _s.sprintf('Invalid x-www-form-url-encode parameter. Data: [%s]', param);
      }
      
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
