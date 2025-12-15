const fs = require('fs-extra')
const path = require('path')

const root = path.resolve(__dirname, '..')
const src = path.join(root, 'node_modules', 'is-generator-function')
const dest = path.join(root, 'lib', 'vendor', 'node_modules', 'is-generator-function')
const shimDir = path.join(root, 'lib', 'vendor', 'node_modules', 'generator-function')

try {
  fs.removeSync(dest)
  fs.copySync(src, dest, { dereference: true })

  // create a tiny shim so require('generator-function') resolves to our vendored CJS
  fs.removeSync(shimDir)
  fs.ensureDirSync(shimDir)
  fs.writeFileSync(path.join(shimDir, 'index.js'), "module.exports = require('../is-generator-function');\n")
  fs.writeFileSync(
    path.join(shimDir, 'package.json'),
    JSON.stringify({ name: 'generator-function', version: '0.0.0', main: 'index.js' }, null, 2)
  )

  console.log('Vendored is-generator-function and shimmed generator-function ->', dest, shimDir)
} catch (err) {
  console.error('Failed to vendor/shim is-generator-function:', err)
  process.exit(1)
}
