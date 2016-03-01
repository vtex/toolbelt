import httpStatusName from 'http-status-name';
import chalk from 'chalk';

export function getErrorMessage(error, response, action) {
  if (error) {
    if (error.code === 'ENOTFOUND') {
      return (chalk.red('Address ' + error.hostname + ' not found') + chalk.yellow('\nAre you online?'));
    }
    return error;
  }

  let errorDetails;
  if (response.body && response.body.message) {
    errorDetails = response.body.message;
  } else {
    errorDetails = JSON.stringify(response.body, null, 2);
  }

  return `Error while ${action}: ${response.statusCode} ${httpStatusName(response.statusCode)} \n${errorDetails}`;
}
