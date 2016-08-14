import test from 'ava'
import path from 'path'
import {
  listLocalFiles,
  createTempPath,
  createChanges,
} from './file'

const FIXTURES_PATH = '../test/fixtures/file-test'
const root = path.resolve(FIXTURES_PATH)

test('list files in a directory ignoring everything except the folders and the manifest file', t => {
  const expectedFiles = [
    'manifest.json',
    './render/Foo.js',
    './render/style.scss',
  ]
  listLocalFiles(root)
  .then(files => t.is(files, expectedFiles))
})

test('creates a temporary folder and returns the path of the temporary file', t => {
  const name = 'renderjs'
  const version = '1.2.0'
  const expectedPath = path.resolve(process.cwd(), 'temp/renderjs-1.2.0.zip')
  createTempPath(name, version)
  .then(path => t.is(path, expectedPath))
})

test('creates a set of changes', t => {
  const manifest = path.resolve(root, 'manifest.json').replace(/\\/g, '/')
  const foo = path.resolve(root, './render/Foo.js').replace(/\\/g, '/')
  const style = path.resolve(root, './render/style.scss').replace(/\\/g, '/')
  const batch = {
    [manifest]: 'save',
    [foo]: 'save',
    [style]: 'remove',
  }
  const expectedChanges = [
    {
      path: manifest,
      action: 'save',
      content: 'ewogICJuYW1lIjogImZvbyIsCiAgInRpdGxlIjogIkEgZm9vIGFwcCIsCiAgInZlcnNpb24iOiAiMC4xLjIiLAogICJ2ZW5kb3IiOiAiYmFyIiwKICAiZGVwZW5kZW5jaWVzIjogWwogICAgInZ0ZXguc3RvcmVmcm9udC1zZGsiOiAiMC54IgogIF0KfQo=',
      encoding: 'base64',
    },
    {
      path: foo,
      action: 'save',
      content: '',
      encoding: 'base64',
    },
    {
      path: style,
      action: 'remove',
    },
  ]
  const changes = createChanges(root, batch)
  t.deepEqual(changes, expectedChanges)
})
