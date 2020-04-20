export interface TableRow {
  [title: string]: any
}

export class TableGenerator {
  private cols = ['Performance', 'Accessibility', 'Best Practices', 'SEO']
  private addedCols: string[] = []
  private rows: TableRow[] = []

  public addReportScores(report: any[]) {
    const row = {}
    report.forEach(audit => {
      row[audit.title] = audit.score
    })
    this.rows.push(row)
  }

  public addColumn(title: string, value: string) {
    if (this.addedCols.indexOf(title) === -1) {
      this.addedCols.push(title)
    }

    this.rows.forEach(row => {
      if (!row[title]) {
        row[title] = value
      }
    })
  }

  public addListOfReports(reports: any[]) {
    reports.forEach(fullReport => {
      this.addReportScores(fullReport.shortReport)

      this.addColumn('Date', new Date(fullReport.generatedAt).toISOString())
      this.addColumn('App Name', fullReport.app)
      this.addColumn('Version', fullReport.version)
      this.addColumn('URL', fullReport.url)
    })
  }

  public show() {
    console.table(this.rows, [...this.addedCols, ...this.cols])
  }
}
