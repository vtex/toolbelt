import { LighthouseReportDoc, ShortReportObject } from '../../lib/clients/IOClients/apps/Lighthouse'

export interface TableRow {
  [title: string]: any
}

export class TableGenerator {
  private cols = ['Performance', 'Accessibility', 'Best Practices', 'SEO']
  private addedCols: string[] = []
  private rows: TableRow[] = []

  /**
   * Insert the scores of a report to the table as a row
   *
   * @param report ShortReportObject array representing the scores of this report
   */
  public addReportScores(report: ShortReportObject[]) {
    const row = report.reduce((acc, audit) => {
      acc[audit.title] = audit.score
      return acc
    }, {})
    this.rows.push(row)
  }

  /**
   * Adds a custom column name to all the rows in this table.
   * Already insert rows will have default value passed as a parameter,
   * but new rows will have its own value
   *
   * @param title Column name
   * @param value Column value for those rows without this information
   */
  public addColumn(title: string, value: string) {
    if (!this.addedCols.includes(title)) {
      this.addedCols.push(title)
    }

    this.rows.forEach(row => {
      if (!row[title]) {
        row[title] = value
      }
    })
  }

  /**
   * It adds all reports as rows in the current table
   *
   * @param reports List of LighthouseReportDoc of masterdata docs
   */
  public addListOfReports(reports: LighthouseReportDoc[]) {
    reports.forEach(fullReport => {
      this.addReportScores(fullReport.shortReport)

      this.addColumn('Date', new Date(fullReport.generatedAt).toISOString())
      this.addColumn('App Name', fullReport.app)
      this.addColumn('Version', fullReport.version)
      this.addColumn('URL', fullReport.url)
    })
  }

  /**
   * Prints a well formated table in stdout
   */
  public show() {
    console.table(this.rows, [...this.addedCols, ...this.cols])
  }
}
