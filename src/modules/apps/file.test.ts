import test from 'ava'
import {resolve} from 'path'

import {listLocalFiles} from './file'

const FIXTURES_PATH = './test/fixtures/file-test'
const root = resolve(FIXTURES_PATH)

test('list files in a directory ignoring everything except the folders and the manifest file', async t => {
  const expectedFiles = [
    'manifest.json',
    'render/Foo.js',
    'render/style.scss',
    // 'empty' is an empty file and therefore is ignored.
  ]
  const files = await listLocalFiles(root)
  t.deepEqual(files, expectedFiles)
})
