/*
 * http-request-parser
 * Copyright(c) 2014 AlexanderMac <amatsibarov@gmail.com>
 * MIT Licensed
 */

var url = require('url');
var _ = require('lodash');
var _s = require('underscore.string');
var httpConsts = require('./http-consts');
var InvalidRequestError = require('./invalid-request-error');

var boundaryRegexp = /boundary=-+\w+/im;
var paramRegexp = /Content-Disposition:\s*form-data;\s*name="\w+"/im;
var paramNameRegexp = /name="\w+"/im;
var quoteRegexp = /"/g;

function HttpRequestParser() { }

HttpRequestParser.prototype.parse = function(request) {
  if (!request) {
    throw new InvalidRequestError('Request must be not empty');
  }

  var requestLines = parseRequestForLines(request);
  
  var first = parseFirstLine(requestLines.first);
  var host = parseHostLine(requestLines.host);
  var headers = parseHeadersLines(requestLines.headers);
  var cookie = parseCookieLine(requestLines.cookie);
  
  var contentTypeHeader = getContentTypeHeader(headers);
  var body = parseBody(requestLines.body, contentTypeHeader);

  return {
    method: first.method,
    protocol: first.protocol,
    url: first.url,
    protocolVersion: first.protocolVersion,
    host: host,
    headers: headers,
    cookie: cookie,
    body: body
  };
};

function parseRequestForLines(request) {
  var headersAndBodySeparator = '\n\n';
  var headersAndBodySeparatorIndex = request.indexOf(headersAndBodySeparator);
  if (headersAndBodySeparatorIndex === -1) {
    throw new InvalidRequestError(
      'Request must contains headers and body, separated by two break lines');
  }

  var headers = request.substr(0, headersAndBodySeparatorIndex);
  var body = request.substr(headersAndBodySeparatorIndex + 
                            headersAndBodySeparator.length);
  
  var headersLines = _s.lines(headers);
  if (headersLines.length === 0) {
    throw new InvalidRequestError('No headers');
  }

  var cookieIndex = _.findIndex(headersLines, function (line) {
    return _s.startsWith(line, 'Cookie:');
  });
  var cookieLine;
  if (cookieIndex !== -1) {
    cookieLine = headersLines[cookieIndex];
    headersLines.splice(cookieIndex, 1);
  }

  return {
    first: headersLines[0],
    host: headersLines[1],
    headers: headersLines.splice(2),
    cookie: cookieLine,
    body: body
  };
}

function parseFirstLine(line) {
  var methodUrlProtocolVer = _s.words(line, ' ');
  if (methodUrlProtocolVer.length !== 3) {
    throw new InvalidRequestError('First line must have format: [Method] SP [Url] SP [Protocol]', line);
  }
  
  var urlObj = url.parse(methodUrlProtocolVer[1]);
  if (!urlObj || !urlObj.protocol || !urlObj.host || !urlObj.path) {
    throw new InvalidRequestError('Url in first line must have format: [Protocol]://[Address]', methodUrlProtocolVer[1]);
  }

  return {
    method: methodUrlProtocolVer[0].toUpperCase(),
    protocol: _s.trim(urlObj.protocol, ':').toUpperCase(),
    url: (urlObj.host + urlObj.path).toLowerCase(),
    protocolVersion: methodUrlProtocolVer[2].toUpperCase()
  };
}

function parseHostLine(line) {
  var headerAndValue = splitIntoTwoParts(line, ':');
  if (!headerAndValue) {
    throw new InvalidRequestError('Host line must have format: [Host]: [Value]', line);
  }
  
  return _s.trim(headerAndValue[1]);
}

function parseHeadersLines(lines) {
  // TODO: add check for duplicate headers
  
  return _.map(lines, function (line) {
    var headerAndValues = splitIntoTwoParts(line, ':');
    if (!headerAndValues) {
      throw new InvalidRequestError('Header line must have format: [HeaderName]: [HeaderValues]', line);
    }
    
    var headerName = _s.trim(headerAndValues[0]);
    var values = _s.words(headerAndValues[1], ',');
    if (!headerName || values.length === 0) {
      throw new InvalidRequestError('Header line must have format: [HeaderName]: [HeaderValues]', line);
    }
    
    var valuesAndParams = _.map(values, function (value) {
      var valueAndParams = _s.words(value, ';');      
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

function parseCookieLine(line) {
  if (!line) {
    return null;
  }

  var headerAndValues = splitIntoTwoParts(line, ':');
  if (!headerAndValues) {
    throw new InvalidRequestError('Cookie line must have format: Cookie: [Name1]=[Value1]...', line);
  } 
  
  var nameValuePairs = _s.words(headerAndValues[1], ';');
  if (nameValuePairs.length === 0) {
    throw new InvalidRequestError('Cookie line must have format: Cookie: [Name1]=[Value1]...', line);
  }

  return _(nameValuePairs)
    .map(function (nameValuePair) {
      var nameValue = _s.words(nameValuePair, '=');
      return !nameValue[0] 
        ? null
        : {
          name: _s.trim(nameValue[0]),
          value: nameValue.length > 1 ? _s.trim(nameValue[1]) : null
        };
    })
    .compact()
    .value();
}

function parseBody(lines, contentTypeHeader) {
  if (!lines) {
    return null;
  }
    
  var body = {};
  
  if (!contentTypeHeader) {
    parsePlainBody(lines, body);
    return body;
  }

  body.contentType = contentTypeHeader.value;  
  switch (body.contentType) {
    case httpConsts.contentTypes.formData:
      parseFormDataBody(lines, body, contentTypeHeader.params);
      break;

    case httpConsts.contentTypes.xWwwFormUrlencoded:
      parseXwwwFormUrlencodedBody(lines, body);
      break;

    default:
      parsePlainBody(lines, body);
      break;
  }

  return body;
}

function parseFormDataBody(lines, body, contentTypeHeadeParams) {
  body.boundary = getBoundaryParameter(contentTypeHeadeParams);
  
  var params = _s.words(lines, '-----------------------' + body.boundary);
  
  body.formDataParams = _(params)
    .map(function (param) {
      var paramMatch = param.match(paramRegexp);
      if (!paramMatch) {
        throw new InvalidRequestError('Invalid formData parameter', param);
      }
      
      var paramNameMatch = paramMatch.toString().match(paramNameRegexp); // TODO: refactor to remove toString
      if (!paramNameMatch) {
        throw new InvalidRequestError('formData parameter name must have format: [Name]="[Value]"', param);
      }
      
      var paramNameParts = _s.words(paramNameMatch, '=');
      if (paramNameParts.length !== 2) {
        throw new InvalidRequestError('formData parameter name must have format: [Name]="[Value]"', param);
      }
      var paramName = paramNameParts[1];
      var paramValue = param.replace(paramMatch, '').trim('\n');
      
      return {
          name: paramName.toString().replace(quoteRegexp, ''), // TODO: refactor to remove toString
          value: paramValue
        };
    })
    .value();
}

function parseXwwwFormUrlencodedBody(lines, body) {
  var params = _s.words(lines, '&');
  
  body.formDataParams = _(params)
    .map(function (param) {
      var paramValue = _s.words(param, '=');
      if (paramValue.length !== 2) {
        throw new InvalidRequestError('Invalid x-www-form-url-encode parameter', param);
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

function parsePlainBody(lines, body) {
  body.plain = lines;
}

function getContentTypeHeader(headers) {
  var contentTypeHeader = _.find(headers, { name: httpConsts.headers.contentType });
  if (!contentTypeHeader) {
    return null;
  }
  return contentTypeHeader.values[0];
}

function getBoundaryParameter(contentTypeHeaderParams) { 
  if (!contentTypeHeaderParams) {
    throw new InvalidRequestError('Request with ContentType=FormData must have a header with boundary');
  }
  
  var boundaryMatch = contentTypeHeaderParams.match(boundaryRegexp);
  if (!boundaryMatch) {
    throw new InvalidRequestError('Boundary param must have format: [boundary]=[value]', contentTypeHeaderParams);
  }
  
  var boundaryAndValue = _s.words(boundaryMatch, '=');
  if (boundaryAndValue.length !== 2) {
    throw new InvalidRequestError('Boundary param must have format: [boundary]=[value]', contentTypeHeaderParams);
  }
  
  var boundaryValue =  _s.trim(boundaryAndValue[1]);
  if (!boundaryValue) {
    throw new InvalidRequestError('Boundary param must have format: [boundary]=[value]', contentTypeHeaderParams);
  }
  return boundaryValue;
}

function splitIntoTwoParts(str, delimiter) {
  var i = str.indexOf(delimiter);
  if (i === -1) {
    return;
  }
  
  var ret = [str.slice(0, i), str.slice(i + 1)];
  if (ret[0].length === 0 || ret[1].length === 0) {
    return;
  }
  
  return ret;
}

var hrp = new HttpRequestParser();
hrp.HttpRequestParser = HttpRequestParser;

module.exports = hrp;
