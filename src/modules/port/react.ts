import { readJSON, outputJSON, remove } from 'fs-extra'
import { forEachObjIndexed, isEmpty } from 'ramda'

import { CommandError } from '../../errors'
import { getManifest } from '../../manifest'
import log from '../../logger'

export default async () => {
  const manifest = await getManifest()
  const oldReact = manifest.builders.react

  if (!oldReact || ['0.x', '1.x'].indexOf(oldReact) === -1) {
    throw new CommandError('Couldn\'t find react builder 0.x-1.x in manifest')
  }

  if (manifest.builders.react === '0.x') {
    const renderJson = await readJSON('react/render.json').catch(() => null)
    if (!renderJson) {
      throw new CommandError('Couldn\'t find react/render.json file')
    }
    log.info('Porting react code to react builder version 2.x')

    const { extensions: react0Extensions } = renderJson
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
      ...!isEmpty(pages) && { pages },
      ...!isEmpty(extensions) && { extensions },
    }

    await outputJSON('pages/pages.json', pagesFile, { spaces: 2 })
    await remove('react/render.json')
  }

  manifest.builders.react = '2.x'
  manifest.builders.pages = '0.x'
  await outputJSON('manifest.json', manifest, { spaces: 2 })

  log.info(`Ported react builder successfully. ${oldReact === '0.x' ? 'Please check your pages/pages.json file.' : ''}`)
}
