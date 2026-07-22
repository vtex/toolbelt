// bin/run has import-time side effects (and uses `node:module`, which the
// Jest resolver can't handle) and is pulled in transitively via CustomCommand.
jest.mock('../../../../bin/run', () => ({ initTimeStartTime: [0, 0] }))

import fs from 'fs'
import os from 'os'
import path from 'path'

// Adjust this import to the new location you exported pathToChange from.
import { pathToChange } from '../../../modules/apps/link' // or '../pathToChange'

jest.mock('../../../api/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))
import log from '../../../api/logger'

const mockYarnFilesManager = {
  maybeMapLocalYarnLinkedPathToProjectPath: (p: string) => p,
  symlinkedDepsDirs: [],
} as any

describe('pathToChange', () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'ptc-'))
    ;(log.warn as jest.Mock).mockClear()
  })

  afterEach(() => {
    delete process.env.TEST_REGISTRY
    fs.rmdir(root, () => {})
  })

  test('regular file: returns base64, byteSize matches, path normalized', () => {
    const rel = path.join('a', 'b', 'file.jsonc')
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    const contentPlain = 'hello world'
    fs.writeFileSync(path.join(root, rel), contentPlain)

    const change = pathToChange(rel, root, mockYarnFilesManager)
    expect(change.path).toBe('a/b/file.jsonc')
    const decoded = Buffer.from(change.content as string, 'base64').toString()
    expect(decoded).toBe(contentPlain)
    expect(change.byteSize).toBe(Buffer.byteLength(change.content as string))
  })

  test('remove flag: returns null content and zero size', () => {
    const rel = 'gone.jsonc'
    fs.writeFileSync(path.join(root, rel), 'x')
    const change = pathToChange(rel, root, mockYarnFilesManager, true)
    expect(change.content).toBeNull()
    expect(change.byteSize).toBe(0)
    expect(change.path).toBe('gone.jsonc')
  })

  test('.npmrc expands existing env vars', () => {
    process.env.TEST_REGISTRY = 'https://registry.example.com'
    const rel = '.npmrc'
    fs.writeFileSync(path.join(root, rel), 'registry=${TEST_REGISTRY}')
    const change = pathToChange(rel, root, mockYarnFilesManager)
    const decoded = Buffer.from(change.content as string, 'base64').toString()
    expect(decoded).toBe('registry=https://registry.example.com')
    expect(log.warn).not.toHaveBeenCalled()
  })

  test('.npmrc fallback when env var missing logs warning and keeps original', () => {
    const rel = '.npmrc'
    fs.writeFileSync(path.join(root, rel), 'registry=${MISSING_VAR}')
    const change = pathToChange(rel, root, mockYarnFilesManager)
    const decoded = Buffer.from(change.content as string, 'base64').toString()
    expect(decoded).toBe('registry=${MISSING_VAR}')
    expect(log.warn).toHaveBeenCalledTimes(1)
  })
})
