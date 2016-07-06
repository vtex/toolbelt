import test from 'ava'
import path from 'path'
import {
  rmBuildPrefix,
  listLocalFiles,
  createTempPath,
  generateFileHash,
  createBatch,
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

test('generates a md5 hash for a file', t => {
  const root = path.resolve('./file-test/')
  const file = 'manifest.json'
  const expectedHash = {
    path: path.resolve(root, file),
    hash: '452708F0474476DE3F1795394676C7D6',
  }
  generateFileHash(root, file)
  .then(hash => t.deepEqual(expectedHash, hash))
})

test('creates a batch of changes based on the diff of the local and the sandbox files', t => {
  const localFiles = [
    {
      path: 'render/assets/Foo.js',
      hash: '111222333444555',
    },
    {
      path: 'render/assets/Bar.js',
      hash: '111222333444555',
    },
    {
      path: 'render/assets/Baz.js',
      hash: '111222333444555',
    },
  ]
  const sbFiles = {
    data: [
      {
        path: 'render/assets/Foo.js',
        hash: '111222333444555',
      },
      {
        path: 'render/assets/Bar.js',
        hash: '111222333444666',
      },
      {
        path: 'render/assets/FooBar.js',
        hash: '111222333444555',
      },
    ],
  }
  const expectedBatch = {
    'render/assets/Bar.js': 'save',
    'render/assets/Baz.js': 'save',
    'render/assets/FooBar.js': 'remove',
  }
  const batch = createBatch(localFiles, sbFiles)
  t.deepEqual(batch, expectedBatch)
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
