import { copy, emptyDir, ensureDir, remove } from 'fs-extra'
import pipeStreams from 'pipe-streams-to-promise'
import request from 'request'
import unzip from 'unzip-stream'

const urlForRepo = (repo: string, org: string) => `https://github.com/${org}/${repo}/archive/master.zip`

const fetchAndUnzip = async (url: string, path: string) => pipeStreams([request(url), unzip.Extract({ path })])

export const clone = async (repo: string, org: string) => {
  const cwd = process.cwd()
  const url = urlForRepo(repo, org)
  const destPath = `${cwd}/${repo}`
  const cloned = `${destPath}/${repo}-master`

  await ensureDir(destPath)
  await emptyDir(destPath)
  await fetchAndUnzip(url, destPath)
  await copy(cloned, destPath)
  await remove(cloned)
}
