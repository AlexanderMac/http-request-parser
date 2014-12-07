/*
 * http-request-parser
 * Copyright(c) 2014 AlexanderMac <amatsibarov@gmail.com>
 * MIT Licensed
 */

var parser = require('./index');
var assert = require('assert');
var util = require('util');

var request = 
  'POST http://localhost/test?dd=e HTTP/1.1\n' +
  'Host: localhost\n' +
  'Connection: keep-alive\n' +
  'Content-Length: 135\n' +
  'Cache-Control: no-cache\n' +
  'User-Agent: Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.131 Safari/537.36\n' +
  'Content-Type: application/json\n' +
  'Accept: */*\n' +
  'Accept-Encoding: gzip,deflate,sdch\n' +
  'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4\n' +
  '\n' +
  '------WebKitFormBoundaryaR6AB9NJoRl7qj9u\n' +
  'Content-Disposition: form-data; name="a"\n' +
  '\n' +
  '123\n' +
  '------WebKitFormBoundaryaR6AB9NJoRl7qj9u--\n';
var requestObj = parser.parse(request);

console.log(util.inspect(requestObj, {colors: true}));