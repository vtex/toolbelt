#!/usr/bin/env node

import auth from '../lib/auth';

auth.logout().then(() => {
  console.log('Local credentials cleared.');
}).catch((error) => {
  if (error.code === 'ENOENT') {
    return console.log('You\'re already logged out');
  }
  return console.log(error(console.log(error)));
});
