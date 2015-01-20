http-request-parser
===================

A node package for parsing HTTP request message, and creating an object model for it. Can be used on server and client sides.


## Features
* Parsing headers (with parameters).
* Parsing cookies.
* Parsing body with contentType:
  * multipart/form-data
  * application/x-www-form-urlencoded
  * text/plain


## Installation 

```
npm i -S http-request-parser
```


## Usage

```javascript
var parser = require('http-request-parser');

var requestMsg = [
  'POST http://app.com/features?p1=v1 HTTP/1.1',
  'Host: app.com',
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
  'Ivanov',
  '-----------------------------11136253119209',
  'Content-Disposition: form-data; name="Age"',
  '',
  '25',
  '-----------------------------11136253119209--'
].join('\n');

var requestObj = parser.parse(requestMsg);
console.log(requestObj);

/* will output:
{ 
  method: 'POST',
  protocol: 'HTTP',
  url: 'app.com/features?p1=v1',
  protocolVersion: 'HTTP/1.1',
  host: 'app.com',
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
      { name: "Name", value: "Ivanov" },
      { name: "Age", value: "25" }
    ] 
  }
}
*/
```

The package generates an object model, which can be used in another [package](https://github.com/AlexanderMac/http-request-builder) (builds HTTP request message from an object model).


## License
This code available under the MIT License.
See License.md for details.  


## Authors

**Alexander Mac** ([amatsibarov@gmail.com](mailto:amatsibarov@gmail.com))
