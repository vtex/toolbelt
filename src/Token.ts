import { decode } from 'jsonwebtoken'

export class Token {
  public token: string | undefined
  private decoded: string | Record<string, any>

  constructor(token: string) {
    this.token = token
    if (this.token) {
      this.decoded = decode(token)
    } else this.decoded = null
  }

  get login() {
    return this.decoded && this.decoded.sub
  }

  public isValid() {
    return (
      this.decoded &&
      typeof this.decoded !== 'string' &&
      this.decoded.exp &&
      Number(this.decoded.exp) >= Date.now() / 1000
    )
  }
}
