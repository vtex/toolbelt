interface ErrorReportArguments {
  code: string
  message: string
  details?: string
}

export class ErrorReport extends Error {
  public readonly code: string
  public readonly details: any

  constructor({ code, message, details }: ErrorReportArguments) {
    super(message)
    this.code = code
    this.details = details
  }
}
