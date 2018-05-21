import { copy, emptyDir, remove } from 'fs-extra'
import * as pipeStreams from 'pipe-streams-to-promise'
import * as request from 'request'
import * as unzip from 'unzip-stream'

const urlForRepo = (repo: string) => `https://github.com/vtex-apps/${repo}/archive/master.zip`

const fetchAndUnzip = async (url: string, path: string) => pipeStreams([
  request(url),
  unzip.Extract({ path }),
])

export const clone = async (repo: string) => {
  const cwd = process.cwd()
  const url = urlForRepo(repo)
  const cloned = `${cwd}/${repo}-master`

  await emptyDir(cwd)
  await fetchAndUnzip(url, cwd)
  await copy(cloned, cwd)
  await remove(cloned)
}
