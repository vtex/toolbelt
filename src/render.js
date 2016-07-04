import fs from 'fs'
import gulp from 'gulp'
import path from 'path'
import sass from 'gulp-sass'
import less from 'gulp-less'
import babel from 'gulp-babel'
import gfilter from 'gulp-filter'
import {Promise, promisify} from 'bluebird'
import vtexRender from 'gulp-vtex-render'

const stat = promisify(fs.stat)

export const renderBasePath = 'render'

export const buildBasePath = '.build'

export const buildAssetsPath = `${buildBasePath}/render/assets`

export const buildComponentsPath = `${buildBasePath}/render/components`

export const buildRoutesPath = `${buildBasePath}/render/routes`

export const buildSettingsPath = `${buildBasePath}/render/settings`

export const buildRouteSettingsPath = `${buildSettingsPath}/routes`

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

export function buildJS (manifest) {
  return () => {
    const componentsFilter = gfilter(`**/${buildComponentsPath}/**/*.json`, {restore: true})
    const routesFilter = gfilter(`**/${buildRoutesPath}/*.json`, {restore: true})
    const routesSettingsFilter = gfilter(`**/${buildRouteSettingsPath}/*.json`, {restore: true})
    return new Promise((resolve, reject) => {
      gulp.src(jsGlob)
      .pipe(babel({
        presets: [
          path.resolve(nodeModulesPath, 'babel-preset-es2015'),
          path.resolve(nodeModulesPath, 'babel-preset-stage-2'),
          path.resolve(nodeModulesPath, 'babel-preset-react'),
        ],
        plugins: [
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
      .pipe(gulp.dest(buildRoutesPath))
      .pipe(routesFilter.restore)
      .pipe(routesSettingsFilter)
      .pipe(gulp.dest(buildRouteSettingsPath))
      .on('end', resolve)
      .on('error', reject)
    })
  }
}

export function watchJS (manifest) {
  gulp.watch(jsGlob, buildJS(manifest))
}

export function buildSass () {
  return new Promise((resolve, reject) => {
    gulp.src(sassGlob)
    .pipe(sass())
    .pipe(gulp.dest(buildAssetsPath))
    .on('end', resolve)
    .on('error', reject)
  })
}

export function watchSass () {
  gulp.watch(sassGlob, buildSass)
}

export function buildLESS () {
  return new Promise((resolve, reject) => {
    gulp.src(lessGlob)
    .pipe(less())
    .pipe(gulp.dest(buildAssetsPath))
    .on('end', resolve)
    .on('error', reject)
  })
}

export function watchLESS () {
  gulp.watch(lessGlob, buildLESS)
}

export function buildRender (manifest) {
  return Promise.all([
    buildJS(manifest)(),
    buildSass(),
    buildLESS(),
  ])
}

export function watchRender (manifest) {
  watchJS(manifest)
  watchSass()
  watchLESS()
}

export function buildAndWatchRender (manifest) {
  buildRender(manifest)
  watchRender(manifest)
}

export default function render (root, manifest) {
  return hasRenderService(root)
  .then(hasRender => hasRender ? buildAndWatchRender(manifest) : null)
}
