import fs from 'fs'
import gulp from 'gulp'
import path from 'path'
import log from './logger'
import tap from 'gulp-tap'
import rimraf from 'rimraf'
import gulpif from 'gulp-if'
import sass from 'gulp-sass'
import less from 'gulp-less'
import babel from 'gulp-babel'
import watch from 'gulp-watch'
import cache from 'gulp-cached'
import eslint from 'gulp-eslint'
import uglify from 'gulp-uglify'
import gfilter from 'gulp-filter'
import cssnano from 'gulp-cssnano'
import imagemin from 'gulp-imagemin'
import remember from 'gulp-remember'
import sourcemaps from 'gulp-sourcemaps'
import vtexRender from 'gulp-vtex-render'
import {Promise, promisify} from 'bluebird'
import {clearLine, cursorTo} from 'readline'
import autoprefixer from 'gulp-autoprefixer'

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

export const cssGlob = `${renderBasePath}/**/*.css`

export const imgGlob = `${renderBasePath}/**/*.{png,gif,jpg,jpeg,svg,ico}`

export const fontGlob = `${renderBasePath}/**/*.{ttf,otf,woff,woff2}`

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

export function removeRouteFile (root) {
  log.debug('Removing route file...')
  return bbRimraf(path.resolve(root, buildRoutesFilePath))
  .catch(err => {
    return err.code === 'ENOENT'
      ? Promise.resolve()
      : Promise.reject(err)
  })
}

export function removeFile (root, key, file) {
  const pathDiff = file.replace(path.join(root, renderBasePath), '')
  fs.unlinkSync(path.join(root, buildAssetsPath, pathDiff))
  if (key === 'scripts') {
    fs.unlinkSync(path.join(root, buildComponentsPath, pathDiff.replace('.js', '.json')))
  }
  delete cache.caches[key][file]
  remember.forget(key, file)
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

export function buildJS (root, manifest, production) {
  const componentsFilter = gfilter(`**/${buildComponentsPath}/**/*.json`, {restore: true})
  const routesFilter = gfilter(`**/${buildRoutesFilePath}`, {restore: true})
  const jsFilter = gfilter(`${buildRenderPath}/**/*.js`, {restore: true})
  return new Promise((resolve, reject) => {
    gulp.src(jsGlob)
    .pipe(cache('scripts'))
    .pipe(gulpif(!production, sourcemaps.init()))
    .pipe(babel({
      presets: [
        path.resolve(nodeModulesPath, 'babel-preset-es2015'),
        path.resolve(nodeModulesPath, 'babel-preset-stage-2'),
        path.resolve(nodeModulesPath, 'babel-preset-react'),
      ],
      plugins: [
        [
          path.resolve(nodeModulesPath, 'babel-plugin-import-rename'),
          {'(.less|.sass|.scss)$': '.css'},
        ],
        path.resolve(nodeModulesPath, 'babel-plugin-vtex-render-route'),
        path.resolve(nodeModulesPath, 'babel-plugin-transform-es2015-modules-systemjs'),
      ],
    }))
    .pipe(gulpif(!production, sourcemaps.write('.')))
    .pipe(gulpif(production, uglify()))
    .pipe(gulp.dest(buildAssetsPath))
    .pipe(jsFilter)
    .pipe(remember('scripts'))
    .pipe(vtexRender({manifest: manifest}))
    .pipe(componentsFilter)
    .pipe(cache('descriptors'))
    .pipe(gulp.dest(buildComponentsPath))
    .pipe(remember('descriptors'))
    .pipe(componentsFilter.restore)
    .pipe(routesFilter)
    .pipe(cache('route'))
    .pipe(tap((file, t) => {
      const content = JSON.parse(file.contents.toString())
      if (content.length === 0) {
        removeRouteFile(root)
        return
      }
      return t.through(gulp.dest, [buildRenderPath])
    }))
    .once('end', resolve)
    .once('error', reject)
  })
}

export function watchJS (root, manifest) {
  watch(jsGlob, () => {
    return lintJS()
    .then(hasLintErrors => {
      return !hasLintErrors
        ? buildJS(root, manifest)
        : null
    })
  })
  .on('unlink', file => removeFile(root, 'scripts', file))
}

export function buildSass (production) {
  return new Promise((resolve, reject) => {
    gulp.src(sassGlob)
    .pipe(cache('sass'))
    .pipe(sass())
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false,
    }))
    .pipe(gulpif(production, cssnano()))
    .pipe(gulp.dest(buildAssetsPath))
    .once('end', resolve)
    .once('error', reject)
  })
}

export function watchSass (root) {
  watch(sassGlob, () => buildSass(false))
  .on('unlink', file => removeFile(root, 'sass', file))
}

export function buildLESS (production) {
  return new Promise((resolve, reject) => {
    gulp.src(lessGlob)
    .pipe(cache('less'))
    .pipe(less())
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false,
    }))
    .pipe(gulpif(production, cssnano()))
    .pipe(gulp.dest(buildAssetsPath))
    .once('end', resolve)
    .once('error', reject)
  })
}

export function watchLESS (root) {
  watch(lessGlob, () => buildLESS(false))
  .on('unlink', file => removeFile(root, 'less', file))
}

export function copyCSS (production) {
  return new Promise((resolve, reject) => {
    gulp.src(cssGlob)
    .pipe(cache('css'))
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false,
    }))
    .pipe(gulpif(production, cssnano()))
    .pipe(gulp.dest(buildAssetsPath))
    .once('end', resolve)
    .once('error', reject)
  })
}

export function watchCSS (root) {
  watch(cssGlob, () => copyCSS(false))
  .on('unlink', file => removeFile(root, 'css', file))
}

export function moveImgs (production) {
  return new Promise((resolve, reject) => {
    gulp.src(imgGlob)
    .pipe(cache('images'))
    .pipe(gulpif(production, imagemin()))
    .pipe(gulp.dest(buildAssetsPath))
    .once('data', () => {
      clearLine(process.stdout, 0)
      cursorTo(process.stdout, 0)
    })
    .once('end', resolve)
    .once('error', reject)
  })
}

export function watchImgs (root, production) {
  watch(imgGlob, () => moveImgs(production))
  .on('unlink', file => removeFile(root, 'images', file))
}

export function copyFonts () {
  return new Promise((resolve, reject) => {
    gulp.src(fontGlob)
    .pipe(cache('fonts'))
    .pipe(gulp.dest(buildAssetsPath))
    .once('end', resolve)
    .once('error', reject)
  })
}

export function watchFonts (root) {
  watch(fontGlob, copyFonts)
  .on('unlink', file => removeFile(root, 'fonts', file))
}

export function buildRender (root, manifest, production) {
  return lintJS()
  .then(hasLintErrors => {
    return !hasLintErrors
      ? buildJS(root, manifest, production)
      : null
  })
  .then(() => {
    return Promise.all([
      buildSass(production),
      buildLESS(production),
      moveImgs(production),
      copyCSS(production),
      copyFonts(),
    ])
  })
}

export function watchRender (root, manifest) {
  watchJS(root, manifest)
  watchSass(root)
  watchLESS(root)
  watchImgs(root)
  watchCSS(root)
  watchFonts(root)
}

export function renderWatch (root, manifest) {
  return hasRenderService(root)
  .then(hasRender => hasRender ? watchRender(root, manifest) : null)
}

export function renderBuild (root, manifest, production = false) {
  return hasRenderService(root)
  .then(hasRender => hasRender ? buildRender(root, manifest, production) : null)
}
