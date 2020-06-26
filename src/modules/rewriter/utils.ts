import Ajv from 'ajv'
import { createHash } from 'crypto'
import csv from 'csvtojson'
import { writeJsonSync } from 'fs-extra'
import jsonSplit from 'json-array-split'
import ProgressBar from 'progress'
import { compose, join, keys, map, match, pluck, prop, replace, sortBy, toLower } from 'ramda'
import { Redirect } from '../../api/clients/IOClients/apps/Rewriter'
import log from '../../api/logger'

export const DELIMITER = ';'
export const MAX_ENTRIES_PER_REQUEST = 10
export const METAINFO_FILE = '.vtex_redirects_metainfo.json'
export const MAX_RETRIES = 10
export const RETRY_INTERVAL_S = 5

export const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

export const showGraphQLErrors = (e: any) => {
  if (e.graphQLErrors) {
    log.error(join('\n', pluck('message', e.graphQLErrors as any[])))
    return true
  }
}

export const handleReadError = (path: string) => (error: any) => {
  console.log(JSON.stringify(error))
  log.error(`Error reading file: ${path}`)
  log.error(`${error.message}`)
  process.exit()
}

const normalizePath = (path: string) => {
  try {
    return compose(replace(/\/+$/, ''), toLower, decodeURI)(path)
  } catch (err) {
    log.error(`Error in URI: ${path}`)
    throw err
  }
}

const sortFunction = (redirect: Redirect) =>
  `${createHash('md5')
    .update(normalizePath(prop('from', redirect)))
    .digest('hex')}`

export const readCSV = async (path: string) => {
  try {
    const result = (await csv({ delimiter: DELIMITER, ignoreEmpty: true, checkType: true }).fromFile(
      path
    )) as Redirect[]
    return sortBy(sortFunction, result)
  } catch (e) {
    handleReadError(path)(e)
  }
}

export const splitJsonArray = (data: any) => jsonSplit(data, MAX_ENTRIES_PER_REQUEST)

export const progressBar = (message: string, curr: number, total: number) =>
  new ProgressBar(`${message} [:bar] :current/:total :percent`, {
    complete: '=',
    incomplete: ' ',
    width: '50',
    curr,
    total,
  })

const parseErrorDataPath = (dataPath: string) => {
  return [match(/\[(.*?)\]/, dataPath)[1], match(/\.(.*?)$/, dataPath)[1]]
}

export const validateInput = (schema: any, routes: any) => {
  const validate = new Ajv().compile(schema)
  const isValid = validate(routes)

  if (!isValid) {
    log.error('Errors validating input:')
    map(({ message, params, dataPath }) => {
      const [errorObjIndex, errorProp] = parseErrorDataPath(dataPath)
      console.error('-----')
      console.error(`${message} - in ${errorObjIndex} (${errorProp})`)
      console.error(params)
      console.error(`JSON content: \n ${JSON.stringify(routes[keys(routes)[errorObjIndex]], null, 2)}`)
      console.error('-----')
    }, validate.errors)
    process.exit()
  }
}

export const saveMetainfo = (metainfo: any, metainfoType: string, fileHash: string, counter: number, data = {}) => {
  if (!metainfo[metainfoType]) {
    metainfo[metainfoType] = {}
  }
  metainfo[metainfoType][fileHash] = { counter, data }
  writeJsonSync(METAINFO_FILE, metainfo, { spaces: 2 })
}

export const deleteMetainfo = (metainfo: any, metainfoType: string, fileHash: string) => {
  if (!metainfo[metainfoType]) {
    return
  }
  delete metainfo[metainfoType][fileHash]
  writeJsonSync(METAINFO_FILE, metainfo, { spaces: 2 })
}

const createEncoder = (delimiter: string) => {
  const encoded = encodeURIComponent(delimiter)
  return (x: string) => x.replace(delimiter, encoded)
}

export const encode = createEncoder(DELIMITER)
