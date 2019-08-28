import * as Ajv from 'ajv'
import { createHash } from 'crypto'
import * as  csv from 'csvtojson'
import { readFile, readJson } from 'fs-extra'
import * as ProgressBar from 'progress'
import { keys, length, map, match } from 'ramda'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import log from '../../logger'
import { MAX_ENTRIES_PER_REQUEST, MAX_RETRIES, METAINFO_FILE, saveMetainfo, sleep, validateInput, readCSV, PROGRESS_DEFAULT_CONFIG, progressString, splitJsonArray } from './utils'

const account = getAccount()
const workspace = getWorkspace()

const inputSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      from: {
        type: 'string',
      },
    },
  },
}

const handleDelete = async (csvPath: string) => {
  const fileHash = await readFile(csvPath).then(data => createHash('md5').update(`${account}${workspace}${data}`).digest('hex'))
  const metainfo = await readJson(METAINFO_FILE).catch(() => ({}))
  const deleteMetainfo = metainfo.deletes || {}
  let counter = deleteMetainfo[fileHash] || 0
  const routes = await readCSV(csvPath)
  validateInput(inputSchema, routes)

  const allPaths = map(
    ({from}) => from,
    routes
  )

  console.log(JSON.stringify(allPaths))
  const separatedPaths = splitJsonArray(allPaths)
  console.log(JSON.stringify(separatedPaths))

  const bar = new ProgressBar(progressString('Deleting routes...'), {
    ...PROGRESS_DEFAULT_CONFIG,
    curr: counter,
    total: length(separatedPaths),
    })

  const listener = createInterface({ input: process.stdin, output: process.stdout })
    .on('SIGINT', () => {
      saveMetainfo(metainfo, 'deletes', fileHash, counter)
      console.log('\n')
      process.exit()
    })

  await Promise.each(
    separatedPaths.splice(counter),
    async (paths: string[]) => {
      try {
        await rewriter.deleteRedirects(paths)
      } catch (e) {
        await saveMetainfo(metainfo, 'deletes', fileHash, counter)
        listener.close()
        throw e
      }
      counter++
      bar.tick()
    }
  )
  console.log('\nFinished!')
  process.exit()
}

const ensureIndexCreation = async () => {
  const index = await rewriter.routesIndex()
  if (index === null) {
    await rewriter.createRoutesIndex()
    console.error('Error getting redirects index. Please try again in some seconds..')
    process.exit()
  }
}

let retryCount = 0
export default async (csvPath: string) => {
  // First check if the redirects index exists
  await ensureIndexCreation()
  try {
    await handleDelete(csvPath)
  } catch (e) {
    console.error('\nError handling delete')
    if (retryCount >= MAX_RETRIES) {
      throw e
    }
    console.error('Retrying in 10 seconds...')
    console.log('Press CTRL+C to abort')
    await sleep(10000)
    retryCount++
    await module.exports.default(csvPath)
  }
}
