export default class CustomGraphQLError extends Error {
  public queryErrors

  constructor (message: string, graphQLErrors: any[]) {
    super(message)
    this.queryErrors = [{graphQLErrors}]
  }
}
