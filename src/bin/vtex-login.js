#!/usr/bin/env node

import { login } from '../lib/auth';

function showSuccessMessage(data) {
  console.log('\n', ('Logged in as ' + data.email).green);
}

function handleError(err) {
  let error = err && err.message ? err.message : err;
  console.log('');
  console.error(error.red);
  process.exit(1);
}

login()
.then(showSuccessMessage)
.catch(handleError);
