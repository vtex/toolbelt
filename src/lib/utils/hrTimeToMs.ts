export function hrTimeToMs(hrtime: [number, number], round = true) {
  if (round) {
    return Math.round(1e3 * hrtime[0] + hrtime[1] / 1e6)
  }

  return 1e3 * hrtime[0] + hrtime[1] / 1e6
}
