import { AppManifest } from '@vtex/api'

export const manifestSamples: Record<string, AppManifest> = {
  'node4-react3-app': {
    vendor: 'vtex',
    name: 'node-react-app',
    version: '1.0.0',
    title: 'CHANGE_ME',
    description: 'CHANGE_ME',
    builders: {
      react: '3.x',
      messages: '1.x',
      node: '4.x',
    },
    dependencies: {
      'vtex.admin': '1.x',
    },
    policies: [],
    $schema: 'https://raw.githubusercontent.com/vtex/node-vtex-api/master/gen/manifest.schema',
  },
}
