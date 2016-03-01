#!/usr/bin/env node

import { login } from '../lib/auth';
import chalk from 'chalk';

function showSuccessMessage(data) {
  console.log('\n', chalk.green('Logged in as ' + data.email));
}

function handleError(err) {
  let error = err && err.message ? err.message : err;
  console.log('');
  console.error(chalk.red(error));
  process.exit(1);
}

login()
.then(showSuccessMessage)
.catch(handleError);
