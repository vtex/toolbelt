// Builders that use typing information
export const BUILDERS_WITH_TYPES = ['react', 'node']

// Builders that demand tooling installation
export const BUILDERS_WITH_TOOLING = ['react', 'node']

// Map of dependencies for the whole project and for each builder
export const DEPENDENCIES = {
  // Common dependencies between projects
  common: {
    '@vtex/prettier-config': '^0.1.4',
    eslint: '^7.12.1',
    'eslint-config-vtex': '^12.3.2',
    husky: '^4.2.3',
    'lint-staged': '^10.1.1',
    prettier: '^2.0.2',
    typescript: '^3.8.3',
  },
  react: {
    'eslint-config-vtex-react': '^6.3.2',
  },
  node: {
    '@types/node': '^12.12.21',
  },
}

export const CONTENT_ESLINT_IGNORE = `
node_modules/
coverage/
*.snap.ts
`

export const CONTENT_PRETTIER_RC = `@vtex/prettier-config`

export const CONTENT_BASE_ESLINT_RC = {
  extends: 'vtex',
  root: true,
  env: {
    node: true,
  },
}

export const CONTENT_ESLINT_RC_BUILDERS = {
  react: {
    extends: 'vtex-react/io',
  },
}
