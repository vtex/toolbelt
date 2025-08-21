import { request as httpsRequest } from 'https'
import { request as httpRequest } from 'http'
import { URL } from 'url'
import readline from 'readline'
import logger from '../api/logger'
import { SessionManager } from '../api/session/SessionManager'
import { randomCryptoString } from '../lib/utils/randomCryptoString'

export interface ChatOptions {
  apiKey?: string
  sendToken?: boolean
}

interface AgentRequestBody {
  sessionId: string
  message: string
  context: {
    account: string
    workspace: string
    token?: string
  }
}

const CHAT_URL = 'http://localhost:8000/interact'
const postJson = (body: any, headers: Record<string, string> = {}): Promise<any> => {
  const urlObj = new URL(CHAT_URL)
  const isHttps = urlObj.protocol === 'https:'
  const libRequest = isHttps ? httpsRequest : httpRequest

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  }

  const options = {
    method: 'POST',
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: `${urlObj.pathname}${urlObj.search}`,
    headers: requestHeaders,
  } as any

  return new Promise((resolve, reject) => {
    const req = libRequest(options, res => {
      res.setEncoding('utf8')
      let raw = ''
      res.on('data', (chunk: string) => {
        raw += chunk
      })
      res.on('end', () => {
        try {
          const json = JSON.parse(raw)
          resolve(json)
        } catch (_) {
          resolve(raw)
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(5_000, () => {
      req.destroy(new Error('Connection timeout - make sure the chat server is running'))
    })
    req.write(JSON.stringify(body))
    req.end()
  })
}

const extractAnswer = (data: any): string => {
  const candidate = data?.answer || data?.response || data?.message || data?.output || data?.text
  if (typeof candidate === 'string') return candidate
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

export const runChatRepl = async ({ apiKey, sendToken }: ChatOptions): Promise<void> => {
  const session = SessionManager.getSingleton()
  const { account, workspace } = session
  const token = sendToken ? session.checkAndGetToken(false) : undefined

  const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const sessionId = randomCryptoString(16, DEFAULT_ALPHABET)

  // Intro
  logger.info(`Starting chat session. Type /exit to quit.`)
  logger.info(`Connecting to chat server at ${CHAT_URL}...`)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  const ask = (): Promise<string> => new Promise(resolve => rl.question('You> ', resolve))

  let keepRunning = true
  while (keepRunning) {
    // eslint-disable-next-line no-await-in-loop
    const inputRaw = await ask()
    const userInput = inputRaw.trim()
    if (!userInput) {
      keepRunning = false
      break
    }
    if (userInput.toLowerCase() === '/exit') {
      keepRunning = false
      break
    }

    const body: AgentRequestBody = {
      sessionId,
      message: userInput,
      context: { account, workspace, token },
    }

    try {
      const headers: Record<string, string> = {}
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`
      
      logger.info(`Sending message: ${userInput}`)
      // eslint-disable-next-line no-await-in-loop
      const res = await postJson(body, headers)
      const answer = extractAnswer(res)
      logger.info(`Agent: ${answer}`)
    } catch (err) {
      logger.error('Chat request failed:', err)
      if (err instanceof Error) {
        logger.error(`Error message: ${err.message}`)
        logger.error(`Error stack: ${err.stack}`)
      }
    }
  }

  rl.close()
  logger.info('Chat ended.')
}
