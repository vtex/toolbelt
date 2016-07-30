import fs from 'fs'
import gulp from 'gulp'
import path from 'path'
import log from './logger'
import rimraf from 'rimraf'
import sass from 'gulp-sass'
import less from 'gulp-less'
import babel from 'gulp-babel'
import watch from 'gulp-watch'
import eslint from 'gulp-eslint'
import gfilter from 'gulp-filter'
import {Promise, promisify} from 'bluebird'
import vtexRender from 'gulp-vtex-render'

const stat = promisify(fs.stat)
const bbRimraf = promisify(rimraf)

export const renderBasePath = 'render'

export const buildBasePath = '.build'

export const buildRenderPath = `${buildBasePath}/${renderBasePath}`

export const buildAssetsPath = `${buildRenderPath}/assets`

export const buildComponentsPath = `${buildRenderPath}/components`

export const buildRoutesFilePath = `${buildRenderPath}/routes.json`

export const jsGlob = `${renderBasePath}/**/*.js`

export const sassGlob = `${renderBasePath}/**/*.scss`

export const lessGlob = `${renderBasePath}/**/*.less`

export const nodeModulesPath = path.resolve(__dirname, '../node_modules/')

export function hasRenderService (root) {
  return stat(path.resolve(root, renderBasePath))
  .then(() => true)
  .catch(err => {
    return err.code === 'ENOENT'
      ? Promise.resolve(false)
      : Promise.reject(err)
  })
}

export function removeConfigsAndJS (root) {
  log.debug('Removing configs and js build folders...')
  return Promise.all([
    bbRimraf(path.resolve(root, buildComponentsPath)),
    bbRimraf(path.resolve(root, buildRoutesFilePath)),
    bbRimraf(path.join(root, buildAssetsPath, '**/*.js')),
  ])
  .catch(err => {
    return err.code === 'ENOENT'
      ? Promise.resolve()
      : Promise.reject(err)
  })
}

export function removeCSS (root) {
  log.debug('Removing css build files...')
  return bbRimraf(path.join(root, buildAssetsPath, '**/*.css'))
  .catch(err => {
    return err.code === 'ENOENT'
      ? Promise.resolve()
      : Promise.reject(err)
  })
}

export function lintJS () {
  return new Promise((resolve, reject) => {
    gulp.src(jsGlob)
    .pipe(
      eslint(path.resolve(__dirname, '../.eslintrc'))
    )
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .once('end', resolve)
    .once('error', err => {
      return err.name && err.name === 'ESLintError'
        ? resolve(true)
        : reject(err)
    })
    .resume()
  })
}

export function buildJS (manifest) {
  const componentsFilter = gfilter(`**/${buildComponentsPath}/**/*.json`, {restore: true})
  const routesFilter = gfilter(`**/${buildRoutesFilePath}`, {restore: true})
  return new Promise((resolve, reject) => {
    gulp.src(jsGlob)
    .pipe(babel({
      presets: [
        path.resolve(nodeModulesPath, 'babel-preset-es2015'),
        path.resolve(nodeModulesPath, 'babel-preset-stage-2'),
        path.resolve(nodeModulesPath, 'babel-preset-react'),
      ],
      plugins: [
        [path.resolve(nodeModulesPath, 'babel-plugin-import-rename'), {'(.less|.sass|.scss)$': '.css'}],
        path.resolve(nodeModulesPath, 'babel-plugin-vtex-render-route'),
        path.resolve(nodeModulesPath, 'babel-plugin-transform-es2015-modules-systemjs'),
      ],
    }))
    .pipe(gulp.dest(buildAssetsPath))
    .pipe(vtexRender({manifest: manifest}))
    .pipe(componentsFilter)
    .pipe(gulp.dest(buildComponentsPath))
    .pipe(componentsFilter.restore)
    .pipe(routesFilter)
    .pipe(gulp.dest(buildRenderPath))
    .once('end', resolve)
    .once('error', reject)
  })
}

export function watchJS (root, manifest) {
  watch(jsGlob, () => {
    return lintJS()
    .then(hasLintErrors => {
      return !hasLintErrors
        ? removeConfigsAndJS(root).then(() => buildJS(manifest))
        : null
    })
  })
}

export function buildSass () {
  return new Promise((resolve, reject) => {
    gulp.src(sassGlob)
    .pipe(sass())
    .pipe(gulp.dest(buildAssetsPath))
    .once('end', resolve)
    .once('error', reject)
  })
}

export function watchSass (root) {
  watch(sassGlob, () => {
    return removeCSS(root)
    .then(buildSass)
  })
}

export function buildLESS () {
  return new Promise((resolve, reject) => {
    gulp.src(lessGlob)
    .pipe(less())
    .pipe(gulp.dest(buildAssetsPath))
    .once('end', resolve)
    .once('error', reject)
  })
}

export function watchLESS (root) {
  watch(lessGlob, () => {
    return removeCSS(root)
    .then(buildLESS)
  })
}

export function buildRender (manifest) {
  return lintJS()
  .then(hasLintErrors => !hasLintErrors ? buildJS(manifest) : null)
  .then(() => {
    return Promise.all([
      buildSass(),
      buildLESS(),
    ])
  })
}

export function watchRender (root, manifest) {
  watchJS(root, manifest)
  watchSass(root)
  watchLESS(root)
}

export function renderWatch (root, manifest) {
  return hasRenderService(root)
  .then(hasRender => hasRender ? watchRender(root, manifest) : null)
}

export function renderBuild (root, manifest) {
  return hasRenderService(root)
  .then(hasRender => hasRender ? buildRender(manifest) : null)
}
