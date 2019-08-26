import * as Ajv from 'ajv'
import { createHash } from 'crypto'
import * as  csv from 'csvtojson'
import { readFile, readJson, writeJsonSync } from 'fs-extra'
import * as jsonSplit from 'json-array-split'
import * as ProgressBar from 'progress'
import { keys, length, map, match } from 'ramda'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import { RedirectInput } from '../../clients/rewriter'
import { getAccount, getWorkspace } from '../../conf'
import log from '../../logger'
import { sleep } from './utils'

const MAX_ENTRIES_PER_REQUEST = 10
const MAX_AUTOMATIC_RETRIES = 10
const IMPORT_METAINFO_FILE = '.vtex_import_info.json'

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

const parseErrorDataPath = (dataPath: string) => {
  return [match(/\[(.*?)\]/, dataPath)[1], match(/\.(.*?)$/, dataPath)[1]]
}

const saveCurrentImportState = (importMetainfo: any, fileHash: string, counter: number) => {
  importMetainfo[fileHash] = counter
  writeJsonSync(IMPORT_METAINFO_FILE, importMetainfo, {spaces: 2})
}

const handleImport = async (csvPath: string) => {
  const fileHash = await readFile(csvPath).then(data => createHash('md5').update(`${account}${workspace}${data}`).digest('hex'))
  const importMetainfo = await readJson(IMPORT_METAINFO_FILE).catch(() => ({}))
  let counter = importMetainfo[fileHash] || 0
  const routes = await csv({delimiter: ';', ignoreEmpty: true}).fromFile(csvPath)
  const validate = (new Ajv()).compile(inputSchema)
  const isValid = validate(routes)

  if (!isValid) {
    log.error('Errors validating input:')
    map(
      ({message, params, dataPath}) => {
        const [errorObjIndex, errorProp] = parseErrorDataPath(dataPath)
        console.error('-----')
        console.error(`${message} - in ${errorObjIndex} (${errorProp})`)
        console.error(params)
        console.error(`JSON content: \n ${JSON.stringify(routes[keys(routes)[errorObjIndex]], null, 2)}`)
        console.error('-----')
      },
      validate.errors
    )
    return
  }

  const routesList = jsonSplit(routes, MAX_ENTRIES_PER_REQUEST)

  const bar = new ProgressBar('Importing routes... [:bar] :current/:total :percent', {
    complete: '=',
    curr: counter,
    incomplete: ' ',
    width: '50',
    total: length(routesList),
    })

  const listener = createInterface({ input: process.stdin, output: process.stdout })
    .on('SIGINT', () => {
      saveCurrentImportState(importMetainfo, fileHash, counter)
      console.log('\n')
      process.exit()
    })

  await Promise.each(
    routesList.splice(counter),
    async (redirects: RedirectInput[]) => {
      try {
        await rewriter.importRedirects(redirects)
      } catch (e) {
        await saveCurrentImportState(importMetainfo, fileHash, counter)
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
    await handleImport(csvPath)
  } catch (e) {
    console.error('\nError handling import')
    if (retryCount >= MAX_AUTOMATIC_RETRIES) {
      throw e
    }
    console.error('Retrying in 10 seconds...')
    console.log('Press CTRL+C to abort')
    await sleep(10000)
    retryCount++
    await module.exports.default(csvPath)
  }
}
