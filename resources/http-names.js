/*
 * http-request-parser
 * Copyright(c) 2014 AlexanderMac <amatsibarov@gmail.com>
 * MIT Licensed
 */

var names = {
  methods: [
    'GET',
    'POST',
    'PUT',
    'DELETE'
  ],
  protocolVersions: [
    'HTTP/1.0',
    'HTTP/1.1',
    'HTTP/1.2',
    'HTTP/2.0'
  ],
  protocols: [
    'HTTP',
    'HTTPS'
  ],
  headers: {
    contentTypeHeader: 'Content-Type',
    contentLengthHeader: 'Content-Length',
  },
  methodGet: 'GET',
  boundaryParam: 'boundary',
  contentTypes: {
    formData: 'multipart/form-data',
    xWwwFormUrlencoded: 'application/x-www-form-urlencoded',
    plain: 'text/plain'
  }
};

module.exports = names;
