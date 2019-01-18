'use strict';

const _                   = require('lodash');
const httpConst           = require('http-const');
const InvalidRequestError = require('./invalid-request-error');

const boundaryRegexp = /boundary=-+\w+/im;
const paramRegexp = /Content-Disposition:\s*form-data;\s*name="\w+"/im;
const paramNameRegexp = /name="\w+"/im;
const quoteRegexp = /"/g;

let httpRequestParser = {
  parse: (requestMsg) => {
    if (!requestMsg) {
      throw new InvalidRequestError('Request must be not undefined');
    }

    let requestMsgLines = _parseRequestForLines(requestMsg);

    let first = _parseFirstLine(requestMsgLines.first);
    let host = _parseHostLine(requestMsgLines.host);
    let headers = _parseHeadersLines(requestMsgLines.headers);
    let cookie = _parseCookieLine(requestMsgLines.cookie);

    let contentTypeHeader = _getContentTypeHeader(headers);
    let body = _parseBody(requestMsgLines.body, contentTypeHeader);

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
  }
};

function _parseRequestForLines(requestMsg) {
  let headersAndBodySeparator = '\n\n';
  let headersAndBodySeparatorIndex = requestMsg.indexOf(headersAndBodySeparator);
  if (headersAndBodySeparatorIndex === -1) {
    throw new InvalidRequestError(
      'Request must contain headers and body, separated by two break lines');
  }

  let headers = requestMsg.substr(0, headersAndBodySeparatorIndex);
  let body = requestMsg.substr(headersAndBodySeparatorIndex +
                            headersAndBodySeparator.length);

  let headersLines = _.split(headers, '\n');
  if (headersLines.length === 0) {
    throw new InvalidRequestError('No headers');
  }

  let cookieIndex = _.findIndex(headersLines, (line) => {
    return _.startsWith(line, 'Cookie:');
  });
  let cookieLine;
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

function _parseFirstLine(line) {
  let methodUrlProtocolVer = _.split(line, ' ');
  if (methodUrlProtocolVer.length !== 3) {
    throw new InvalidRequestError('First line must have format: [Method] [Url] [Protocol]', line);
  }

  let protocolAndUrl = _splitIntoTwoParts(methodUrlProtocolVer[1], '://');
  if (!protocolAndUrl) {
    throw new InvalidRequestError(
      'Url in first line must have format: [Protocol]://[Address]',
      methodUrlProtocolVer[1]
    );
  }

  return {
    method: methodUrlProtocolVer[0].toUpperCase(),
    protocol: protocolAndUrl[0].toUpperCase(),
    url: protocolAndUrl[1].toLowerCase(),
    protocolVersion: methodUrlProtocolVer[2].toUpperCase()
  };
}

function _parseHostLine(line) {
  let headerAndValue = _splitIntoTwoParts(line, ':');
  if (!headerAndValue) {
    throw new InvalidRequestError('Host line must have format: [Host]: [Value]', line);
  }

  return headerAndValue[1];
}

function _parseHeadersLines(lines) {
  // TODO: add check for duplicate headers

  return _.map(lines, line => {
    let headerAndValues = _splitIntoTwoParts(line, ':');
    if (!headerAndValues) {
      throw new InvalidRequestError('Header line must have format: [HeaderName]: [HeaderValues]', line);
    }

    let headerName = headerAndValues[0];
    let values = _.split(headerAndValues[1], ',');
    if (!headerName || values.length === 0 || _.some(values, val => _.isEmpty(val))) {
      throw new InvalidRequestError('Header line must have format: [HeaderName]: [HeaderValues]', line);
    }

    let valuesAndParams = _.map(values, (value) => {
      let valueAndParams = _.split(value, ';');
      return {
        value: _.trim(valueAndParams[0]),
        params: valueAndParams.length > 1 ? _.trim(valueAndParams[1]) : null
      };
    });

    return {
      name: headerName,
      values: valuesAndParams
    };
  });
}

function _parseCookieLine(line) {
  if (!line) {
    return null;
  }

  let headerAndValues = _splitIntoTwoParts(line, ':');
  if (!headerAndValues) {
    throw new InvalidRequestError('Cookie line must have format: Cookie: [Name1]=[Value1]...', line);
  }

  let nameValuePairs = _.split(headerAndValues[1], ';');
  if (nameValuePairs.length === 0) {
    throw new InvalidRequestError('Cookie line must have format: Cookie: [Name1]=[Value1]...', line);
  }

  return _.chain(nameValuePairs)
    .map((nameValuePair) => {
      let nameValue = _.split(nameValuePair, '=');
      return !nameValue[0] ?
        null :
        {
          name: _.trim(nameValue[0]),
          value: nameValue.length > 1 ? _.trim(nameValue[1]) : null
        };
    })
    .compact()
    .value();
}

function _parseBody(lines, contentTypeHeader) {
  if (!lines) {
    return null;
  }

  let body = {};

  if (!contentTypeHeader) {
    _parsePlainBody(lines, body);
    return body;
  }

  body.contentType = contentTypeHeader.value;
  switch (body.contentType) {
    case httpConst.contentTypes.formData:
      _parseFormDataBody(lines, body, contentTypeHeader.params);
      break;

    case httpConst.contentTypes.xWwwFormUrlencoded:
      _parseXwwwFormUrlencodedBody(lines, body);
      break;

    case httpConst.contentTypes.json:
      _parseJsonBody(lines, body);
      break;

    default:
      _parsePlainBody(lines, body);
      break;
  }

  return body;
}

function _parseFormDataBody(lines, body, contentTypeHeadeParams) {
  body.boundary = _getBoundaryParameter(contentTypeHeadeParams);

  let params = _.split(lines, `-----------------------${body.boundary}`);

  body.formDataParams = _.chain(params)
    .slice(1, params.length - 1)
    .map(param => {
      let paramMatch = param.match(paramRegexp);
      if (!paramMatch) {
        throw new InvalidRequestError('Invalid formData parameter', param);
      }

      let paramNameMatch = paramMatch.toString().match(paramNameRegexp); // TODO: refactor to remove toString
      if (!paramNameMatch) {
        throw new InvalidRequestError('formData parameter name must have format: [Name]="[Value]"', param);
      }

      let paramNameParts = _.split(paramNameMatch, '=');
      if (paramNameParts.length !== 2) {
        throw new InvalidRequestError('formData parameter name must have format: [Name]="[Value]"', param);
      }
      let paramName = paramNameParts[1];
      let paramValue = param.replace(paramMatch, '').trim('\n');

      return {
        name: paramName.toString().replace(quoteRegexp, ''), // TODO: refactor to remove toString
        value: paramValue
      };
    })
    .value();
}

function _parseXwwwFormUrlencodedBody(lines, body) {
  let params = _.split(lines, '&');

  body.formDataParams = _.chain(params)
    .map(param => {
      let paramValue = _.split(param, '=');
      if (paramValue.length !== 2) {
        throw new InvalidRequestError('Invalid x-www-form-url-encode parameter', param);
      }

      return !paramValue[0] ?
        null :
        {
          name: paramValue[0],
          value: paramValue.length > 1 ? paramValue[1] : null
        };
    })
    .compact()
    .value();
}

function _parseJsonBody(lines, body) {
  body.json = lines;
}

function _parsePlainBody(lines, body) {
  body.plain = lines;
}

function _getContentTypeHeader(headers) {
  let contentTypeHeader = _.find(headers, { name: httpConst.headers.contentType });
  if (!contentTypeHeader) {
    return null;
  }
  return contentTypeHeader.values[0];
}

function _getBoundaryParameter(contentTypeHeaderParams) {
  if (!contentTypeHeaderParams) {
    throw new InvalidRequestError('Request with ContentType=FormData must have a header with boundary');
  }

  let boundaryMatch = contentTypeHeaderParams.match(boundaryRegexp);
  if (!boundaryMatch) {
    throw new InvalidRequestError('Boundary param must have format: [boundary]=[value]', contentTypeHeaderParams);
  }

  let boundaryAndValue = _.split(boundaryMatch, '=');
  if (boundaryAndValue.length !== 2) {
    throw new InvalidRequestError('Boundary param must have format: [boundary]=[value]', contentTypeHeaderParams);
  }

  let boundaryValue =  _.trim(boundaryAndValue[1]);
  if (!boundaryValue) {
    throw new InvalidRequestError('Boundary param must have format: [boundary]=[value]', contentTypeHeaderParams);
  }
  return boundaryValue;
}

function _splitIntoTwoParts(str, delimiter) {
  if (_.isEmpty(str)) {
    return;
  }

  let i = str.indexOf(delimiter);
  if (i === -1) {
    return;
  }

  let res = [str.slice(0, i), str.slice(i + delimiter.length)];
  res[0] = _.trim(res[0]);
  res[1] = _.trim(res[1]);
  if (res[0].length === 0 || res[1].length === 0) {
    return;
  }

  return res;
}

module.exports = httpRequestParser;
