import test from 'ava'
import path from 'path'
import {
  rmBuildPrefix,
  listLocalFiles,
  createTempPath,
  createChanges,
} from './file'

test('removes the build folder from the start of a path', t => {
  t.is(rmBuildPrefix('.build/render/assets/Foo.js'), 'render/assets/Foo.js')
})

test('list files in a directory ignoring everything except the build folder and the manifest file', t => {
  const root = path.resolve('./file-test')
  const expectedFiles = [
    'manifest.json',
    '.build/render/assets/Foo.js',
    '.build/render/assets/style.css',
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
  const root = path.resolve('./file-test')
  const manifest = path.resolve(root, 'manifest.json')
  const foo = path.resolve(root, '.build/render/assets/Foo.js')
  const style = path.resolve(root, '.build/render/assets/style.css')
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
      path: rmBuildPrefix(foo),
      action: 'save',
      content: '',
      encoding: 'base64',
    },
    {
      path: rmBuildPrefix(style),
      action: 'remove',
    },
  ]
  const changes = createChanges(root, batch)
  t.deepEqual(changes, expectedChanges)
})
