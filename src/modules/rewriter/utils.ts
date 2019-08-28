import * as Ajv from 'ajv'
import * as  csv from 'csvtojson'
import { readFile, readJson, writeJsonSync } from 'fs-extra'
import * as jsonSplit from 'json-array-split'
import * as ProgressBar from 'progress'
import { keys, length, map, match } from 'ramda'

import log from '../../logger'

const MAX_ENTRIES_PER_REQUEST = 10
export const METAINFO_FILE = '.vtex_redirects_metainfo.json'
export const MAX_RETRIES = 10
export const PROGRESS_DEFAULT_CONFIG = {
  complete: '=',
  incomplete: ' ',
  width: '50',
}

export const progressString = (message: string) => `${message} [:bar] :current/:total :percent`

export const sleep = (milliseconds) =>
  new Promise(resolve => setTimeout(resolve, milliseconds))

export const readCSV = async (path: string) =>
  await csv({delimiter: ';', ignoreEmpty: true}).fromFile(path)

export const splitJsonArray = (data: any) => jsonSplit(data, MAX_ENTRIES_PER_REQUEST)

export const progressBar = (message: string, curr: number, total: number) =>
  new ProgressBar(progressString('Deleting routes...'), {
    ...PROGRESS_DEFAULT_CONFIG,
    curr: counter,
    total: length(separatedPaths),
    })

const parseErrorDataPath = (dataPath: string) => {
  return [match(/\[(.*?)\]/, dataPath)[1], match(/\.(.*?)$/, dataPath)[1]]
}

export const validateInput = (schema: any, routes: any) => {
  const validate = (new Ajv()).compile(schema)
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
    process.exit()
  }
}

export const saveMetainfo = (metainfo: any, metainfoType: string, fileHash: string, counter: number, data={}) => {
  if (!metainfo[metainfoType]) {
    metainfo[metainfoType] = {}
  }
  metainfo[metainfoType][fileHash] = { counter, data }
  writeJsonSync(METAINFO_FILE, metainfo, {spaces: 2})
}

