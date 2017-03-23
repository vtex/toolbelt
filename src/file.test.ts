import test from 'ava'
import {resolve} from 'path'

import {listLocalFiles} from './file'

const FIXTURES_PATH = './test/fixtures/file-test'
const root = resolve(FIXTURES_PATH)

test('list files in a directory ignoring everything except the folders and the manifest file', t => {
  const expectedFiles = [
    'manifest.json',
    './render/Foo.js',
    './render/style.scss',
  ]
  listLocalFiles(root)
  .then(files => t.is(files, expectedFiles))
})
