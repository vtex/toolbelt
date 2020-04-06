import { flags } from '@oclif/command'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import opn from 'opn'
import R from 'ramda'

import { CustomCommand } from '../lib/CustomCommand'
import * as conf from '../conf'
import { clusterIdDomainInfix, publicEndpoint } from '../env'

// Doesn't seem to work with 'import', seems to return undefined for some reason ¯\_(ツ)_/¯
const QRCode = require('qrcode-terminal') // eslint-disable-line @typescript-eslint/no-var-requires

const isSupportRole = (role: string): boolean => role?.startsWith('vtex.support-authority')

const isSupportSession = (): boolean => {
  const token = conf.getToken()
  const decoded = jwt.decode(token)
  if (!decoded || typeof decoded === 'string') {
    return false
  }

  return R.any(role => isSupportRole(role), decoded.roles as string[])
}

const prepareSupportBrowser = async (account: string, workspace: string): Promise<string> => {
  const token = conf.getToken()

  const uri = `https://${workspace}--${account}.${publicEndpoint()}/_v/private/support-login/prepare`
  const response = await axios.get(uri, {
    headers: {
      'X-Vtex-Original-Credential': token,
    },
  })
  return response.data.oneTimeToken
}

export default class Browse extends CustomCommand {

  static description = 'Add app(s) to the manifest dependencies'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
    qr: flags.boolean({ char: 'q', description: 'Outputs a QR Code on the terminal' }),
  }

  static args = [{ name: 'endpointInput' }]

  async run() {
    const { args, flags } = this.parse(Browse)

    const endpointInput = [args.endpointInput]

    const { account, workspace } = conf.currentContext
    let endpoint = endpointInput ?? ''
    if (isSupportSession()) {
      const token = await prepareSupportBrowser(account, workspace)
      endpoint = `_v/private/support-login/login?token=${token}&returnUrl=/${endpoint}`
    }
    const uri = `https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}/${endpoint}`

    if (flags.qr) {
      QRCode.generate(uri, { small: true })
      return
    }

    opn(uri, { wait: false })
  }
}
