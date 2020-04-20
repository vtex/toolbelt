import { showReports } from './showReports'

export default async (url: string, options) => {
  const app = options
  await showReports(app, url)
}
