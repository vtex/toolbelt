import isWSL from 'is-wsl'
import isDocker from 'is-docker'

export function truncateStringsFromObject(element: any, maxStrSize: number) {
  if (element === null || element === undefined) {
    return element
  }
  if (typeof element === 'object') {
    Object.keys(element).forEach(key => {
      element[key] = truncateStringsFromObject(element[key], maxStrSize)
    })
    return element
  }
  if (typeof element === 'string' && element.length > maxStrSize) {
    return `${element.substr(0, maxStrSize)}[...TRUNCATED]`
  }
  return element
}

export function hrTimeToMs(hrtime: [number, number]) {
  return 1e3 * hrtime[0] + hrtime[1] / 1e6
}

export function getPlatform() {
  if (isWSL) {
    return `${process.platform}:wsl`
  }

  if (isDocker()) {
    return `${process.platform}:container`
  }

  return process.platform
}
