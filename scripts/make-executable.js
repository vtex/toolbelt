#!/usr/bin/env node
/* eslint import/unambiguous: "off" */
'use strict'

const {resolve} = require('path')
const {readFileSync, writeFileSync, chmodSync} = require('fs')

const cliPath = resolve(__dirname, '../lib/cli.js')

try {
  readFileSync(cliPath, 'utf8')
} catch (err) {
  if (err && err.code === 'ENOENT') {
    writeFileSync(cliPath, '')
  } else {
    throw err
  }
}
chmodSync(cliPath, 0o755)
