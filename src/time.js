const startQueue = []

export function timeStart () {
  const start = process.hrtime()
  startQueue.push(start)
  return start
}

export function timeStop () {
  if (startQueue.length === 0) {
    return
  }
  const end = process.hrtime(startQueue.shift())
  return `${end[0]}s ${parseFloat(end[1] / 1000000).toFixed(0)}ms`
}
