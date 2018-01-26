import {readJSON, outputJSON, remove} from 'fs-extra'
import {forEachObjIndexed, isEmpty} from 'ramda'

import {CommandError} from '../../errors'
import {getManifest} from '../../manifest'
import log from '../../logger'

export default async () => {
  const manifest = await getManifest()
  if (!manifest.builders.react || manifest.builders.react !== '0.x') {
    throw new CommandError('Couldn\'t find react 0.x builder in manifest')
  }
  const renderJson = await readJSON('react/render.json').catch(() => null)
  if (!renderJson) {
    throw new CommandError('Couldn\'t find react/render.json file')
  }
  log.info('Porting react code to react builder version 1.x')

  manifest.builders.react = '1.x'
  manifest.builders.pages = '0.x'

  const {extensions: react0Extensions} = renderJson
  const pages = {}
  const extensions = {}

  forEachObjIndexed((val: any, key) => {
    const {
      route,
      component,
      theme,
      settings,
    } = val

    if (route && route.path) {
      pages[key] = {
        ...route,
        theme: theme && theme.replace('./', '').replace('.css', ''),
      }
    }

    if (component) {
      extensions[key] = {
        component: component && component.replace('./', '').replace('.js', ''),
        props: settings,
      }
    }
  }, react0Extensions)

  const pagesFile = {
    ...!isEmpty(pages) && {pages},
    ...!isEmpty(extensions) && {extensions},
  }

  await outputJSON('manifest.json', manifest, {spaces: 2})
  await outputJSON('pages/pages.json', pagesFile, {spaces: 2})
  await remove('react/render.json')

  log.info('Ported react builder successfully. Please check your pages/pages.json file.')
}
