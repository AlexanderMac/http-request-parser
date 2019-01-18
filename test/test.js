'use strict';

const _                   = require('lodash');
const should              = require('should');
const parser              = require('../index');
const InvalidRequestError = require('../lib/invalid-request-error');

describe('parse', () => {
  describe('start-line', () => {
    let requestMsg = [
      'GET http://app.com/features?p1=v1 HTTP/1.1',
      'Host: app.com',
      'Connection: keep-alive',
      'Cache-Control: no-cache',
      'User-Agent: Mozilla/5.0 (Windows NT 6.1 WOW64)',
      'Accept: */*',
      'Accept-Encoding: gzip,deflate',
      'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
      '',
      ''
    ];

    let requestObj = {
      method: 'GET',
      protocol: 'HTTP',
      url: 'app.com/features?p1=v1',
      protocolVersion: 'HTTP/1.1',
      host: 'app.com',
      headers: [
        {
          name: 'Connection',
          values: [
            { value: 'keep-alive', params: null }
          ]
        },
        {
          name: 'Cache-Control',
          values: [
            { value: 'no-cache', params: null }
          ]
        },
        {
          name: 'User-Agent',
          values: [
            { value: 'Mozilla/5.0 (Windows NT 6.1 WOW64)', params: null }
          ]
        },
        {
          name: 'Accept',
          values: [
            { value: '*/*', params: null }
          ]
        },
        {
          name: 'Accept-Encoding',
          values: [
            { value: 'gzip', params: null },
            { value: 'deflate', params: null }
          ]
        },
        {
          name: 'Accept-Language',
          values: [
            { value: 'ru-RU', params: null },
            { value: 'ru', params: 'q=0.8' },
            { value: 'en-US', params: 'q=0.6' },
            { value: 'en', params: 'q=0.4' }
          ]
        }
      ],
      cookie: null,
      body: null
    };

    it('should throw Error when start-line without three parts separated by space', () => {
      let rm = _.cloneDeep(requestMsg);

      rm[0] = 'GEThttp://app.com/features?p1=v1 HTTP/1.1';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. First line must have format: ' +
                 '[Method] [Url] [Protocol]. Data: GEThttp://app.com/features?p1=v1 HTTP/1.1'
      });

      rm[0] = 'GEThttp://app.com/features?p1=v1HTTP/1.1';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. First line must have format: ' +
                 '[Method] [Url] [Protocol]. Data: GEThttp://app.com/features?p1=v1HTTP/1.1'
      });
    });

    it('should throw Error when start-line with invalid url', () => {
      let rm = _.cloneDeep(requestMsg);

      rm[0] = 'GET app.com/features?p1=v1 HTTP/1.1';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Url in first line must have format: ' +
                 '[Protocol]://[Address]. Data: app.com/features?p1=v1'
      });

      rm[0] = 'GET http:/app.com/features?p1=v1 HTTP/1.1';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Url in first line must have format: ' +
                 '[Protocol]://[Address]. Data: http:/app.com/features?p1=v1'
      });

      rm[0] = 'GET www.app.com/features?p1=v1 HTTP/1.1';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Url in first line must have format: ' +
                 '[Protocol]://[Address]. Data: www.app.com/features?p1=v1'
      });
    });

    it('should parse GET method', () => {
      let rm = _.cloneDeep(requestMsg);
      rm[0] = 'GET http://app.com/features?p1=v1 HTTP/1.1';
      let ro = _.cloneDeep(requestObj);
      ro.method = 'GET';

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse DELETE method', () => {
      let rm = _.cloneDeep(requestMsg);
      rm[0] = 'DELETE http://app.com/features?p1=v1 HTTP/1.1';
      let ro = _.cloneDeep(requestObj);
      ro.method = 'DELETE';

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse HTTP protocol and URI without parameters', () => {
      let rm = _.cloneDeep(requestMsg);
      rm[0] = 'GET http://app.com/features HTTP/1.1';
      let ro = _.cloneDeep(requestObj);
      ro.url = 'app.com/features';

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse HTTP protocol and URI with parameters', () => {
      let rm = _.cloneDeep(requestMsg);
      rm[0] = 'GET http://app.com/features?p1=v1 HTTP/1.1';
      let ro = _.cloneDeep(requestObj);
      ro.url = 'app.com/features?p1=v1';

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse HTTPS protocol and URI without parameters', () => {
      let rm = _.cloneDeep(requestMsg);
      rm[0] = 'GET https://app.com/features HTTP/1.1';
      let ro = _.cloneDeep(requestObj);
      ro.url = 'app.com/features';
      ro.protocol = 'HTTPS';

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse HTTPS protocol and URI with parameters', () => {
      let rm = _.cloneDeep(requestMsg);
      rm[0] = 'GET https://app.com/features?p1=v1 HTTP/1.1';
      let ro = _.cloneDeep(requestObj);
      ro.url = 'app.com/features?p1=v1';
      ro.protocol = 'HTTPS';

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse HTTP protocol v1.0', () => {
      let rm = _.cloneDeep(requestMsg);
      rm[0] = 'GET http://app.com/features?p1=v1 HTTP/1.0';
      let ro = _.cloneDeep(requestObj);
      ro.protocolVersion = 'HTTP/1.0';

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse HTTP protocol v2.0', () => {
      let rm = _.cloneDeep(requestMsg);
      rm[0] = 'GET http://app.com/features?p1=v1 HTTP/2.0';
      let ro = _.cloneDeep(requestObj);
      ro.protocolVersion = 'HTTP/2.0';

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });
  });

  describe('host line', () => {
    let requestMsg = [
      'GET http://app.com/features?p1=v1 HTTP/1.1',
      'Host: app.com',
      'Connection: keep-alive',
      'Cache-Control: no-cache',
      'User-Agent: Mozilla/5.0 (Windows NT 6.1 WOW64)',
      'Accept: */*',
      'Accept-Encoding: gzip,deflate',
      'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
      '',
      ''
    ];

    let requestObj = {
      method: 'GET',
      protocol: 'HTTP',
      url: 'app.com/features?p1=v1',
      protocolVersion: 'HTTP/1.1',
      host: 'app.com',
      headers: [
        {
          name: 'Connection',
          values: [
            { value: 'keep-alive', params: null }
          ]
        },
        {
          name: 'Cache-Control',
          values: [
            { value: 'no-cache', params: null }
          ]
        },
        {
          name: 'User-Agent',
          values: [
            { value: 'Mozilla/5.0 (Windows NT 6.1 WOW64)', params: null }
          ]
        },
        {
          name: 'Accept',
          values: [
            { value: '*/*', params: null }
          ]
        },
        {
          name: 'Accept-Encoding',
          values: [
            { value: 'gzip', params: null },
            { value: 'deflate', params: null }
          ]
        },
        {
          name: 'Accept-Language',
          values: [
            { value: 'ru-RU', params: null },
            { value: 'ru', params: 'q=0.8' },
            { value: 'en-US', params: 'q=0.6' },
            { value: 'en', params: 'q=0.4' }
          ]
        }
      ],
      cookie: null,
      body: null
    };

    it('should throw Error when invalid host line', () => {
      let rm = _.cloneDeep(requestMsg);

      rm[1] = 'Host app.com';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Host line must have format: ' +
                 '[Host]: [Value]. Data: Host app.com'
      });

      rm[1] = 'Host     ';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Host line must have format: ' +
                 '[Host]: [Value]. Data: Host     '
      });

      rm[1] = ': app.com';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Host line must have format: ' +
                 '[Host]: [Value]. Data: : app.com'
      });
    });

    it('should parse valid host line', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);
      ro.host = 'app.com';

      rm[1] = 'Host: app.com';
      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);

      rm[1] = 'Host   :  app.com';
      actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });
  });

  describe('headers', () => {
    let requestMsg = [
      'GET http://app.com/features?p1=v1 HTTP/1.1',
      'Host: app.com',
      'Connection: keep-alive',
      'Cache-Control: no-cache',
      'User-Agent: Mozilla/5.0 (Windows NT 6.1 WOW64)',
      'Accept: */*',
      'Accept-Encoding: gzip,deflate',
      'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
      'Referer: http://app2.net/user/fjvbuq/',
      '',
      ''
    ];

    let requestObj = {
      method: 'GET',
      protocol: 'HTTP',
      url: 'app.com/features?p1=v1',
      protocolVersion: 'HTTP/1.1',
      host: 'app.com',
      headers: [
        {
          name: 'Connection',
          values: [
            { value: 'keep-alive', params: null }
          ]
        },
        {
          name: 'Cache-Control',
          values: [
            { value: 'no-cache', params: null }
          ]
        },
        {
          name: 'User-Agent',
          values: [
            { value: 'Mozilla/5.0 (Windows NT 6.1 WOW64)', params: null }
          ]
        },
        {
          name: 'Accept',
          values: [
            { value: '*/*', params: null }
          ]
        },
        {
          name: 'Accept-Encoding',
          values: [
            { value: 'gzip', params: null },
            { value: 'deflate', params: null }
          ]
        },
        {
          name: 'Accept-Language',
          values: [
            { value: 'ru-RU', params: null },
            { value: 'ru', params: 'q=0.8' },
            { value: 'en-US', params: 'q=0.6' },
            { value: 'en', params: 'q=0.4' }
          ]
        },
        {
          name: 'Referer',
          values: [
            { value: 'http://app2.net/user/fjvbuq/', params: null }
          ]
        }
      ],
      cookie: null,
      body: null
    };

    it('should throw Error when header has invalid format', () => {
      let rm = _.cloneDeep(requestMsg);

      rm[2] = 'Connection keep-alive';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Header line must have format: ' +
                 '[HeaderName]: [HeaderValues]. Data: Connection keep-alive'
      });

      rm[2] = 'Connection: ';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Header line must have format: ' +
                 '[HeaderName]: [HeaderValues]. Data: Connection: '
      });

      rm[2] = ' : keep-alive';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Header line must have format: ' +
                 '[HeaderName]: [HeaderValues]. Data:  : keep-alive'
      });
    });

    it('should parse valid headers', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse Accept-Language header with one value', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      rm[7] = 'Accept-Language: ru-RU;q=0.8';
      ro.headers[5].values = [
        { value: 'ru-RU', params: 'q=0.8' }
      ];

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse Accept-Language header with two values', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      rm[7] = 'Accept-Language: ru-RU;q=0.8, en-US';
      ro.headers[5].values = [
        { value: 'ru-RU', params: 'q=0.8' },
        { value: 'en-US', params: null }
      ];

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });
  });

  describe('cookies', () => {
    let requestMsg = [
      'GET http://app.com/features?p1=v1 HTTP/1.1',
      'Host: app.com',
      'Connection: keep-alive',
      'Cache-Control: no-cache',
      'User-Agent: Mozilla/5.0 (Windows NT 6.1 WOW64)',
      'Accept: */*',
      'Accept-Encoding: gzip,deflate',
      'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
      'Cookie: csrftoken=123abc;sessionid=456def',
      '',
      ''
    ];

    let requestObj = {
      method: 'GET',
      protocol: 'HTTP',
      url: 'app.com/features?p1=v1',
      protocolVersion: 'HTTP/1.1',
      host: 'app.com',
      headers: [
        {
          name: 'Connection',
          values: [
            { value: 'keep-alive', params: null }
          ]
        },
        {
          name: 'Cache-Control',
          values: [
            { value: 'no-cache', params: null }
          ]
        },
        {
          name: 'User-Agent',
          values: [
            { value: 'Mozilla/5.0 (Windows NT 6.1 WOW64)', params: null }
          ]
        },
        {
          name: 'Accept',
          values: [
            { value: '*/*', params: null }
          ]
        },
        {
          name: 'Accept-Encoding',
          values: [
            { value: 'gzip', params: null },
            { value: 'deflate', params: null }
          ]
        },
        {
          name: 'Accept-Language',
          values: [
            { value: 'ru-RU', params: null },
            { value: 'ru', params: 'q=0.8' },
            { value: 'en-US', params: 'q=0.6' },
            { value: 'en', params: 'q=0.4' }
          ]
        }
      ],
      cookie: [
        {
          name: 'csrftoken', value: '123abc' },
        {
          name: 'sessionid', value: '456def' }
      ],
      body: null
    };

    it('should throw Error when cookie is invalid', () => {
      let rm = _.cloneDeep(requestMsg);

      rm[8] = 'Cookie: ';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Cookie line must have format: ' +
                 'Cookie: [Name1]=[Value1].... Data: Cookie: '
      });
    });

    it('should not throw Error when empty cookie line', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      rm.splice(8, 1);
      ro.cookie = null;

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse cookie with one name-value pair', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      rm[8] = 'Cookie: csrftoken=123abc';
      ro.cookie = [
        {
          name: 'csrftoken', value: '123abc' }
      ];

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse cookie with one name-value pair and parameters', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      rm[8] = 'Cookie: csrftoken=123abc;sessionid=456def';
      ro.cookie = [
        {
          name: 'csrftoken', value: '123abc' },
        {
          name: 'sessionid', value: '456def' }
      ];

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });
  });

  describe('body', () => {
    let requestMsg = [
      'GET http://app.com/features?p1=v1 HTTP/1.1',
      'Host: app.com',
      'Connection: keep-alive',
      'Cache-Control: no-cache',
      'User-Agent: Mozilla/5.0 (Windows NT 6.1 WOW64)',
      'Accept: */*',
      'Accept-Encoding: gzip,deflate',
      'Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
      'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length: 301',
      '',
      ''
    ];

    let requestObj = {
      method: 'GET',
      protocol: 'HTTP',
      url: 'app.com/features?p1=v1',
      protocolVersion: 'HTTP/1.1',
      host: 'app.com',
      headers: [
        {
          name: 'Connection',
          values: [
            { value: 'keep-alive', params: null }
          ]
        },
        {
          name: 'Cache-Control',
          values: [
            { value: 'no-cache', params: null }
          ]
        },
        {
          name: 'User-Agent',
          values: [
            { value: 'Mozilla/5.0 (Windows NT 6.1 WOW64)', params: null }
          ]
        },
        {
          name: 'Accept',
          values: [
            { value: '*/*', params: null }
          ]
        },
        {
          name: 'Accept-Encoding',
          values: [
            { value: 'gzip', params: null },
            { value: 'deflate', params: null }
          ]
        },
        {
          name: 'Accept-Language',
          values: [
            { value: 'ru-RU', params: null },
            { value: 'ru', params: 'q=0.8' },
            { value: 'en-US', params: 'q=0.6' },
            { value: 'en', params: 'q=0.4' }
          ]
        },
        {
          name: 'Content-Type',
          values: [
            { value: 'application/x-www-form-urlencoded', params: 'charset=UTF-8' }
          ]
        },
        {
          name: 'Content-Length',
          values: [
            { value: '301', params: null }
          ]
        },
      ],
      cookie: null,
      body: null
    };

    it('should throw Error when body has invalid format and ContentType=application/x-www-form-urlencoded', () => {
      let rm = _.cloneDeep(requestMsg);

      rm[8] = 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8';

      rm[11] = 'id=11&messageHello';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Invalid x-www-form-url-encode parameter. ' +
                 'Data: messageHello'
      });

      rm[11] = 'id=11&message=Hello& ';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Invalid x-www-form-url-encode parameter. ' +
                 'Data:  '
      });
    });

    it('should throw Error when body has invalid format and ContentType=multipart/form-data', () => {
      let rm = _.cloneDeep(requestMsg);

      rm[8] = 'Content-Type: multipart/form-data; boundary=------11136253119209';
      rm[11] = '-----------------------------11136253119209';
      rm[12] = 'Content-Disposit: form-data; name="Name"';
      rm[13] = '';
      rm[14] = 'Smith';
      rm[15] = '-----------------------------11136253119209';
      rm[16] = 'Content-Disposition: form-data;';
      rm[17] = '';
      rm[18] = '25';
      rm[19] = '-----------------------------11136253119209--';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Invalid formData parameter. ' +
                 'Data: \nContent-Disposit: form-data; name="Name"\n\nSmith\n'
      });
    });

    it('should throw Error when ContentType=multipart/form-data without and boundary parameter has invalid format', () => {
      let rm = _.cloneDeep(requestMsg);

      rm[11] = 'body';

      rm[8] = 'Content-Type: multipart/form-data';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Request with ContentType=FormData must have a header with boundary'
      });

      rm[8] = 'Content-Type: multipart/form-data; boundary';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Boundary param must have format: [boundary]=[value]. ' +
                 'Data: boundary'
      });

      rm[8] = 'Content-Type: multipart/form-data; boundary=';
      should(parser.parse.bind(null, rm.join('\n'))).throw(InvalidRequestError, {
        message: 'Invalid request message. Boundary param must have format: [boundary]=[value]. ' +
                 'Data: boundary='
      });
    });

    it('should not throw Error when body is empty', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      ro.body = null;

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse valid body with ContentType=application/x-www-form-urlencoded', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      rm[8] = 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8';
      rm[11] = 'id=11&message=Hello';

      ro.headers[6].values = [{
        value: 'application/x-www-form-urlencoded',
        params: 'charset=UTF-8'
      }];
      ro.body = {
        contentType: 'application/x-www-form-urlencoded',
        formDataParams: [
          {
            name: 'id', value: '11' },
          {
            name: 'message', value: 'Hello' }
        ]
      };

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse valid body with ContentType=multipart/form-data', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      rm[8] = 'Content-Type: multipart/form-data; boundary=------11136253119209';
      rm[11] = '-----------------------------11136253119209';
      rm[12] = 'Content-Disposition: form-data; name="Name"';
      rm[13] = '';
      rm[14] = 'Smith';
      rm[15] = '-----------------------------11136253119209';
      rm[16] = 'Content-Disposition: form-data; name="Age"';
      rm[17] = '';
      rm[18] = '25';
      rm[19] = '-----------------------------11136253119209--';

      ro.headers[6].values = [{
        value: 'multipart/form-data',
        params: 'boundary=------11136253119209'
      }];
      ro.body = {
        contentType: 'multipart/form-data',
        boundary: '------11136253119209',
        formDataParams: [
          {
            name: 'Name', value: 'Smith' },
          {
            name: 'Age', value: '25' }
        ]
      };

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse valid body with ContentType=application/json', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      rm[8] = 'Content-Type: application/json';
      rm[11] = '{{"p1": "v1"}, {"p2": "v2"}}';

      ro.headers[6].values = [{
        value: 'application/json',
        params: null
      }];
      ro.body = {
        contentType: 'application/json',
        json: '{{"p1": "v1"}, {"p2": "v2"}}'
      };

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });

    it('should parse valid body with ContentType=text/plain', () => {
      let rm = _.cloneDeep(requestMsg);
      let ro = _.cloneDeep(requestObj);

      rm[8] = 'Content-Type: text/plain';
      rm[11] = 'Plain text';

      ro.headers[6].values = [{
        value: 'text/plain',
        params: null
      }];
      ro.body = {
        contentType: 'text/plain',
        plain: 'Plain text'
      };

      let actual = parser.parse(rm.join('\n'));
      should(actual).eql(ro);
    });
  });
});
