export function hrTimeToMs(hrtime: [number, number]) {
  return 1e3 * hrtime[0] + hrtime[1] / 1e6
}
