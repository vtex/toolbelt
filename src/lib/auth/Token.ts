import { decode } from 'jsonwebtoken'

import { getToken } from '../../conf'
import { copyToClipboard } from '../../utils/copyToClipboard'

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

export function authToken() {
  const token = getToken()
  copyToClipboard(token)
  return console.log(token)
}
