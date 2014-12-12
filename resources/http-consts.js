/*
 * http-request-parser
 * Copyright(c) 2014 AlexanderMac <amatsibarov@gmail.com>
 * MIT Licensed
 */

var httpConsts = {
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
    contentType: 'Content-Type',
    contentLength: 'Content-Length',
  },
  
  contentTypes: {
    formData: 'multipart/form-data',
    xWwwFormUrlencoded: 'application/x-www-form-urlencoded',
    plain: 'text/plain'
  },
  
  GET_METHOD: 'GET',
  BOUNDARY: 'boundary',
};

module.exports = httpConsts;
