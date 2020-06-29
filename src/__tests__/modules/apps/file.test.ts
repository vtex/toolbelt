import path from 'path'
import { listLocalFiles } from '../../../api/modules/apps/file'

const root = path.resolve(__dirname, '../../fixtures/file-test')

test('list files in a directory ignoring everything except the folders and the manifest file', async () => {
  const expectedFiles = [
    'manifest.json',
    'render/Foo.js',
    'render/style.scss',
    // 'empty' is an empty file and therefore is ignored.
  ]
  const files = await listLocalFiles(root)
  expect(files.length).toEqual(expectedFiles.length)
  expect(files).toEqual(expect.arrayContaining(expectedFiles))
})
