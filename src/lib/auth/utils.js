import httpStatusName from 'http-status-name';

export function getErrorMessage(error, response, action) {
  if (error) {
    if (error.code === 'ENOTFOUND') {
      return ('Address ' + error.hostname + ' not found').red + '\nAre you online?'.yellow;
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
