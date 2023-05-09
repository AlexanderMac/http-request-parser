# http-request-parser
## WARNING :warning:: This repo is not maintained anymore, use [http-z](https://github.com/AlexanderMac/http-z) instead.

Parse HTTP request message and create an object model for it. Can be used on server and client sides. To build HTTP request message from an object model use [http-request-builder](https://github.com/AlexanderMac/http-request-builder).

[![Build Status](https://travis-ci.org/AlexanderMac/http-request-parser.svg?branch=master)](https://travis-ci.org/AlexanderMac/http-request-parser)
[![Code Coverage](https://codecov.io/gh/AlexanderMac/http-request-parser/branch/master/graph/badge.svg)](https://codecov.io/gh/AlexanderMac/http-request-parser)
[![npm version](https://badge.fury.io/js/http-request-parser.svg)](https://badge.fury.io/js/http-request-parser)

### Features
* Parse HTTP request object:
  - headers (with parameters)
  - cookies
  - body (with supported contentTypes: `multipart/form-data`, `application/x-www-form-urlencoded`, `text/plain`)

### Installation 
```sh
npm i -S http-request-parser
```

### Usage
```js
const parser = require('http-request-parser');

let requestMsg = [
  'POST http://example.com/features?p1=v1 HTTP/1.1',
  'Host: example.com',
  'Connection: keep-alive',      
  'Cache-Control: no-cache',
  'User-Agent: Mozilla/5.0 (Windows NT 6.1 WOW64)',
  'Content-Type: multipart/form-data;boundary=------11136253119209',
  'Content-Length: 101',
  'Cookie: csrftoken=123abc; sessionid=456def',
  'Accept: */*',
  'Accept-Encoding: gzip,deflate',
  'Accept-Language: en-US;q=0.6, en;q=0.4',
  '',
  '-----------------------------11136253119209',
  'Content-Disposition: form-data; name="Name"',
  '',
  'Smith',
  '-----------------------------11136253119209',
  'Content-Disposition: form-data; name="Age"',
  '',
  '25',
  '-----------------------------11136253119209--'
].join('\n');

let requestObj = parser.parse(requestMsg);
console.log(requestObj);

/* outputs:
{ 
  method: 'POST',
  protocol: 'HTTP',
  url: 'example.com/features?p1=v1',
  protocolVersion: 'HTTP/1.1',
  host: 'example.com',
  headers: [ 
    { name: 'Connection', values: [ { value: 'keep-alive', params: null } ] },          
    { name: 'Cache-Control', values: [ { value: 'no-cache', params: null } ] },
    { name: 'User-Agent', values: [ 
      { value: 'Mozilla/5.0 (Windows NT 6.1 WOW64)', params: null } 
    ]},
    { name: 'Content-Type', values: [ { value: 'multipart/form-data', params: 'boundary=------11136253119209' } ] },
    { name: 'Content-Length', values: [ { value: '101', params: null } ] },
    { name: 'Accept', values: [ { value: '/', params: null } ] },
    { name: 'Accept-Encoding', values: [ 
      { value: 'gzip', params: null },
      { value: 'deflate', params: null }
    ]},
    { name: 'Accept-Language', values: [
      { value: 'en-US', params: 'q=0.6' },
      { value: 'en', params: 'q=0.4' } 
    ]}
  ],
  cookie: [
    { name: 'csrftoken', value: '123abc' },
    { name: 'sessionid', value: '456def' }
  ],
  body: {
    contentType: 'multipart/form-data',
    boundary: '------11136253119209',
    formDataParams: [
      { name: "Name", value: "Smith" },
      { name: "Age", value: "25" }
    ] 
  }
}
*/
```
### Author
Alexander Mac

### License
Licensed under the MIT license.
