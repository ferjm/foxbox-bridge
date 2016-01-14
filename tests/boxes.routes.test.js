/* global describe */
/* global it */

var superagent = require('superagent');
var expect     = require('expect.js');

describe('Boxes routes', function() {

  it('Heartbeat', function (done){
    superagent.get('http://localhost:3000/')
      .end(function(e,res){
        console.log(res.body)
        expect(e).to.eql(null)
        done()
      })    
  })

})
