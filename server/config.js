'use strict';

var convict = require('convict');
var fs      = require('fs');
var path    = require('path');

var conf = convict({
  env: {
    doc: 'The applicaton environment',
    format: [ 'dev', 'prod'],
    default: 'dev',
    env: 'NODE_ENV'
  },
  fxaProfile: {
    doc: 'The Firefox Accounts profile server url',
    format: String,
    env: 'FXA_PROFILE',
    default: 'https://stable.dev.lcip.org/profile/v1'
  },
  fxaVerifier: {
    doc: 'The Firefox Accounts verifier url',
    format: String,
    env: 'FXA_VERIFIER',
    default: 'https://oauth-stable.dev.lcip.org/v1/verify'
  },
  wsConnectEndpoint: {
    doc: 'The endpoint to initiate a external connection with a FoxBox',
    format: String,
    default: '/connect'
  }
});

var envConfig = path.join(__dirname, '/../config', conf.get('env') + '.json');
var files = (envConfig + ',' + process.env.CONFIG_FILES)
    .split(',')
    .filter(fs.existsSync);

conf.loadFile(files);
conf.validate();

module.exports.conf = conf;
