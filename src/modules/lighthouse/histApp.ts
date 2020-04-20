import { showReports } from './showReports'

export default async (app: string, options) => {
  const url = options
  await showReports(app, url)
}
