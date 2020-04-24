import { createHash } from 'crypto'
import { readFile, readJson } from 'fs-extra'
import { length } from 'ramda'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import log from '../../logger'
import { isVerbose } from '../../verbose'
import {
  accountAndWorkspace,
  deleteMetainfo,
  handleReadError,
  MAX_RETRIES,
  METAINFO_FILE,
  progressBar,
  readCSV,
  RETRY_INTERVAL_S,
  saveMetainfo,
  showGraphQLErrors,
  sleep,
  splitJsonArray,
  validateInput,
} from './utils'

const DELETES = 'deletes'
const [account, workspace] = accountAndWorkspace

const inputSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      from: {
        type: 'string',
      },
      binding: {
        type: 'string',
      },
    },
    required: ['from'],
  },
}

const handleDelete = async (csvPath: string) => {
  const fileHash = (await readFile(csvPath)
    .then(data =>
      createHash('md5')
        .update(`${account}_${workspace}_${data}`)
        .digest('hex')
    )
    .catch(handleReadError)) as string
  const metainfo = await readJson(METAINFO_FILE).catch(() => ({}))
  const deletesMetainfo = metainfo[DELETES] || {}
  let counter = deletesMetainfo[fileHash] ? deletesMetainfo[fileHash].counter : 0
  const routes = await readCSV(csvPath)
  validateInput(inputSchema, routes)

  const allLocators = routes?.map(({ from, binding }) => ({ from, binding }))

  const separatedLocators = splitJsonArray(allLocators)

  const bar = progressBar('Deleting routes...', counter, length(separatedLocators))

  const listener = createInterface({ input: process.stdin, output: process.stdout }).on('SIGINT', () => {
    saveMetainfo(metainfo, DELETES, fileHash, counter)
    console.log('\n')
    process.exit()
  })

  for (const batch of separatedLocators.splice(counter)) {
    try {
      const { paths, locators } = batch.reduce(
        (acc: any, curr: any) => {
          if (curr.binding) {
            acc.locators.push(curr)
          } else {
            acc.paths.push(curr.from)
          }
          return acc
        },
        { paths: [], locators: [] }
      )
      // eslint-disable-next-line no-await-in-loop
      await rewriter.deleteRedirects(paths, locators)
    } catch (e) {
      // eslint-disable-next-line no-await-in-loop
      await saveMetainfo(metainfo, 'deletes', fileHash, counter)
      listener.close()
      throw e
    }
    counter++
    bar.tick()
  }

  log.info('Finished!\n')
  listener.close()
  deleteMetainfo(metainfo, DELETES, fileHash)
}

let retryCount = 0
export default async (csvPath: string) => {
  try {
    await handleDelete(csvPath)
  } catch (e) {
    log.error('Error handling delete')
    const maybeGraphQLError = showGraphQLErrors(e)
    if (isVerbose) {
      console.log(e)
    }
    if (retryCount >= MAX_RETRIES || maybeGraphQLError) {
      process.exit()
    }
    log.error(`Retrying in ${RETRY_INTERVAL_S} seconds...`)
    log.info('Press CTRL+C to abort')
    await sleep(RETRY_INTERVAL_S * 1000)
    retryCount++
    await module.exports.default(csvPath)
  }
}
