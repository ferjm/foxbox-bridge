var expect     = require('expect.js');
var fxaMock    = require('./fxa.mock.server');
var superagent = require('superagent');

describe('Functional tests', function() {

  var origin = 'http://localhost:3000';

  var routes = {
    '/': [{
      name: 'get'
    }],
    '/boxes/': [{
      name: 'get',
      auth: true
    }, {
      name: 'post',
      auth: true
    }],
    '/boxes/id/': [{
      name: 'del',
      auth: true
    }],
    '/boxes/id/users/': [{
      name: 'get',
      auth: true
    }, {
      name: 'post',
      auth: true
    }],
    '/boxes/id/users/email/': [{
      name: 'put',
      auth: true
    }, {
      name: 'del',
      auth: true
    }]
  };

  /** CORS **/

  Object.keys(routes).forEach(function(route) {
    describe('OPTIONS ' + route, function() {
      it('should authorize any origin to do CORS', function (done){
        superagent
          .options(origin + route)
          .set('Origin', 'http://mozilla.org')
          .end(function(e, res) {
            expect(e).to.eql(null);
            expect('Access-Control-Allow-Origin', '*');
            expect('Access-Control-Allow-Methods',
                   'GET,HEAD,PUT,PATCH,POST,DELETE');
            done();
          });
      });
    });
  });

  /** Auth **/

  describe('Authentication', function() {
    describe('Auth token OK', function() {
      beforeEach(function() {
        fxaMock.response();
      });

      afterEach(function() {
        fxaMock.reset();
      });

      Object.keys(routes).forEach(function(route) {
        var methods = routes[route];
        methods.forEach(function(method) {
          if (method.auth) {
            it('should reject ' + method.name.toUpperCase() + ' ' + route +
               ' request without "Authorization" header', function(done) {
              superagent[method.name](origin + route)
                .end(function(e, res) {
                  expect(e).to.be.an('object');
                  expect(res.status).to.be.equal(401);
                  expect(res.body.code).to.be.equal(401);
                  expect(res.body.errno).to.be.equal(401);
                  expect(res.body.error).to.be.equal('Unauthorized');
                  expect(res.body.message).to.be.equal('Unauthorized');
                  done();
                });
            });

            it('should accept ' + method.name.toUpperCase() + ' ' + route +
               ' request with "Authorization" header', function(done) {
              superagent[method.name](origin + route)
                .set('Authorization', 'Bearer token')
                .set('Accept', 'application/json')
                .end(function(e, res) {
                  expect(res.status).to.not.be.equal(401);
                  done();
                });
            });
          } else {
            it('should accept ' + method.name.toUpperCase() + ' ' + route +
               ' request without "Authorization" header', function(done) {
              superagent[method.name](origin + route)
                .end(function(e, res) {
                  expect(res.status).to.not.be.equal(401);
                  done();
                });
            });
          }
        });
      });
    });

    [{
      test: 'Cannot verify auth token',
      fxaMethod: 'verify'
    }, {
      test: 'Cannot fetch user profile',
      fxaMethod: 'getProfile'
    }].forEach(function(config) {
      describe(config.test, function() {
        beforeEach(function() {
          var response = {};
          response[config.fxaMethod] = {
            status: 401,
            body: {
              code: 401,
              errno: 401,
              error: 'Unauthorized'
            }
          };
          fxaMock.response(response);
        });

        afterEach(function() {
          fxaMock.reset();
        });

        Object.keys(routes).forEach(function(route) {
          var methods = routes[route];
          methods.forEach(function(method) {
            if (!method.auth) {
              return;
            }
            it('should reject ' + method.name.toUpperCase() + ' ' + route +
               ' request with invalid "Authorization" header', function(done) {
              superagent[method.name](origin + route)
                .set('Authorization', 'Bearer token')
                .set('Accept', 'application/json')
                .end(function(e, res) {
                  expect(e).to.be.an('object');
                  expect(res.status).to.be.equal(401);
                  expect(res.body.code).to.be.equal(401);
                  expect(res.body.errno).to.be.equal(401);
                  expect(res.body.error).to.be.equal('Unauthorized');
                  expect(res.body.message).to.be.equal('Unauthorized');
                  done();
                });
            });
          });
        });
      });
    });
  });

  /** Boxes registration. **/

  describe('Boxes registration', function() {

    beforeEach(function() {
      fxaMock.response();
    });

    afterEach(function() {
      fxaMock.reset();
    });

    it('should return no boxes', function(done) {
      superagent
        .get(origin + '/boxes/')
        .set('Authorization', 'Bearer token')
        .set('Accept', 'application/json')
        .end(function(e, res) {
          expect(e).to.eql(null);
          done();
        });
    });
  });
})
