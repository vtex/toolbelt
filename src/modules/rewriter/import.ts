import { createHash } from 'crypto'
import { readFile, readJson } from 'fs-extra'
import { length }  from 'ramda'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import { RedirectInput } from '../../clients/rewriter'
import log from '../../logger'
import { isVerbose } from '../../utils'
import { accountAndWorkspace, deleteMetainfo, ensureIndexCreation, MAX_RETRIES, METAINFO_FILE, progressBar, readCSV, saveMetainfo, sleep, splitJsonArray, validateInput } from './utils'

const IMPORTS = 'imports'
const [account, workspace] = accountAndWorkspace

const inputSchema = { type: 'array',
  items: {
    type: 'object',
    properties: {
      from: {
        type: 'string',
      },
      to: {
        type: 'string',
      },
      endDate: {
        type: 'string',
      },
      type: {
        type: 'string',
        enum: ['PERMANENT', 'TEMPORARY'],
      },
    },
  },
}

const handleImport = async (csvPath: string) => {
  const fileHash = await readFile(csvPath).then(data => createHash('md5').update(`${account}_${workspace}_${data}`).digest('hex'))
  const metainfo = await readJson(METAINFO_FILE).catch(() => ({}))
  const importMetainfo = metainfo[IMPORTS] || {}
  let counter = importMetainfo[fileHash] ? importMetainfo[fileHash].counter : 0
  const routes = await readCSV(csvPath)
  validateInput(inputSchema, routes)

  const routesList = splitJsonArray(routes)

  const bar = progressBar('Importing routes...', counter, length(routesList))

  const listener = createInterface({ input: process.stdin, output: process.stdout })
    .on('SIGINT', () => {
      saveMetainfo(metainfo, IMPORTS, fileHash, counter)
      console.log('\n')
      process.exit()
    })

  await Promise.each(
    routesList.splice(counter),
    async (redirects: RedirectInput[]) => {
      try {
        await rewriter.importRedirects(redirects)
      } catch (e) {
        await saveMetainfo(metainfo, IMPORTS, fileHash, counter)
        listener.close()
        throw e
      }
      counter++
      bar.tick()
    }
  )

  log.info('\nFinished!\n')
  listener.close()
  deleteMetainfo(metainfo, IMPORTS, fileHash)
}

let retryCount = 0
export default async (csvPath: string) => {
  // First check if the redirects index exists
  await ensureIndexCreation()
  try {
    await handleImport(csvPath)
    process.exit()
  } catch (e) {
    log.error('\nError handling import')
    if (retryCount >= MAX_RETRIES) {
      throw e
    }
    if (isVerbose) {
      log.error(e)
    }
    log.error('Retrying in 10 seconds...')
    log.info('Press CTRL+C to abort')
    await sleep(10000)
    retryCount++
    await module.exports.default(csvPath)
  }
}
