import ora from 'ora'

let counter = 0
const spinner = ora()

export function setSpinnerText (text) {
  spinner.text = text
}

export function startSpinner () {
  counter = counter + 1
  spinner.start()
}

export function stopSpinner () {
  if (counter === 0) {
    return
  }

  counter = counter - 1
  if (counter > 0) {
    return false
  }

  spinner.stop()
  return true
}
