#!/usr/bin/env node

import { logout } from '../lib/auth';

function showSuccessMessage() {
  console.log('Local credentials cleared.');
}

function handleError(error) {
  if (error.code === 'ENOENT') {
    return console.log('You\'re already logged out');
  }
  return console.log(error(console.log(error)));
}

logout()
.then(showSuccessMessage)
.catch(handleError);
