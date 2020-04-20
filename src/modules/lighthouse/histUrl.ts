import { lighthouse } from '../../clients'

export default async (url: string, options) => {
  const app = options

  const reports = await lighthouse.getReports(app, url)

  console.log(reports)
}
