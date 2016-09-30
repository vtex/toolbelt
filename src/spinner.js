import ora from 'ora'

let counter = 0
let spinnerTimeout
const DEFAULT_TIMEOUT_MS = 8 * 1000
const spinner = ora()

function createSpinnerTimeout (timeout = DEFAULT_TIMEOUT_MS) {
  spinnerTimeout = setTimeout(() => stopSpinner(), timeout)
}

function clearSpinnerTimeout () {
  if (spinnerTimeout) {
    clearTimeout(spinnerTimeout)
  }
  spinnerTimeout = null
}

function resetSpinnerTimeout (timeout) {
  clearSpinnerTimeout()
  createSpinnerTimeout(timeout)
}

export function setSpinnerText (text, timeout) {
  resetSpinnerTimeout(timeout)
  spinner.text = text
}

export function startSpinner (timeout) {
  counter = counter + 1
  resetSpinnerTimeout(timeout)
  spinner.start()
}

export function stopSpinner () {
  if (counter === 0) {
    return
  }

  counter = counter - 1
  clearSpinnerTimeout()
  if (counter > 0) {
    return false
  }

  spinner.stop()
  return true
}

export function isSpinnerActive () {
  return counter > 0
}
