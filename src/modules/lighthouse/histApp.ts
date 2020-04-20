import { lighthouse } from '../../clients'

export default async (app: string, options) => {
  const url = options

  const reports = await lighthouse.getReports(app, url)

  console.log(reports)
}
