import fs from 'fs'
import gulp from 'gulp'
import path from 'path'
import sass from 'gulp-sass'
import less from 'gulp-less'
import babel from 'gulp-babel'
import {Promise, promisify} from 'bluebird'
import vtexRender from 'gulp-vtex-render'

const stat = promisify(fs.stat)

export const renderBasePath = './render'

export const buildBasePath = './.build'

export const renderAssetsPath = `${renderBasePath}/assets`

export const buildAssetsPath = `${buildBasePath}/render/assets`

export const buildComponentsPath = `${buildBasePath}/render/components`

export const jsGlob = `${renderAssetsPath}/**/*.js`

export const sassGlob = `${renderAssetsPath}/**/*.scss`

export const lessGlob = `${renderAssetsPath}/**/*.less`

export const nodeModulesPath = path.resolve(__dirname, '../node_modules/')

export function hasRenderService (root) {
  return stat(path.resolve(root, 'render/'))
  .then(() => true)
  .catch(err => {
    return err.code === 'ENOENT'
      ? Promise.resolve(false)
      : Promise.reject(err)
  })
}

export function buildJS (manifest) {
  return () => {
    gulp.src(jsGlob)
    .pipe(babel({
      presets: [
        path.resolve(nodeModulesPath, 'babel-preset-es2015'),
        path.resolve(nodeModulesPath, 'babel-preset-react'),
      ],
      plugins: [
        path.resolve(nodeModulesPath, 'babel-plugin-transform-es2015-modules-systemjs'),
      ],
    }))
    .pipe(gulp.dest(buildAssetsPath))
    .pipe(vtexRender({manifest: manifest}))
    .pipe(gulp.dest(buildComponentsPath))
  }
}

export function watchJS (manifest) {
  gulp.watch(jsGlob, buildJS(manifest))
}

export function buildSass () {
  gulp.src(sassGlob)
  .pipe(sass())
  .pipe(gulp.dest(buildAssetsPath))
}

export function watchSass () {
  gulp.watch(sassGlob, buildSass)
}

export function buildLESS () {
  gulp.src(lessGlob)
  .pipe(less())
  .pipe(gulp.dest(buildAssetsPath))
}

export function watchLESS () {
  gulp.watch(lessGlob, buildLESS)
}

export function buildRender (manifest) {
  buildJS(manifest)()
  buildSass()
  buildLESS()
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
