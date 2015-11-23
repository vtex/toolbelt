#!/usr/bin/env node

import { logout } from '../lib/auth';

function showSuccessMessage() {
  console.log('Local credentials cleared.');
}

function handleError(error) {
  if (error.code === 'ENOENT') {
    console.error('You\'re already logged out');
  } else {
    console.error(error);
  }
  process.exit(1);
}

logout()
.then(showSuccessMessage)
.catch(handleError);
