import isDocker from 'is-docker'
import isWSL from 'is-wsl'

export function getPlatform() {
  if (isWSL) {
    return `${process.platform}:wsl`
  }

  if (isDocker()) {
    return `${process.platform}:container`
  }

  return process.platform
}
