#!/usr/bin/env node

import { login } from '../lib/auth';

function showSuccessMessage(data) {
  console.log('\n', ('Logged in as ' + data.email).green);
}

function handleError(error) {
  console.log(error.message);
}

login()
.then(showSuccessMessage)
.catch(handleError);
