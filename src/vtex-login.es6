#!/usr/bin/env node
let program = require('commander');
let pkg = require('../package.json');
let auth = require('./lib/auth');
var prompt = require('prompt');

program
  .version(pkg.version)
  .parse(process.argv);

let schema = {
  properties: {
    email: {
      format: 'email',
      message: 'Must be a valid email',
      required: true
    },
    password: {
      hidden: true,
      message: 'Password is required',
      required: true
    }
  }
};

prompt.start();
prompt.get(schema, (err, result) => {
  auth.login(result.email, result.password);
});
