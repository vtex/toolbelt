export default {
  link: {
    description: 'Start a development session for this app',
    options: [
      {
        short: 'c',
        long: 'clean',
        description: 'Clean builder cache',
        type: 'boolean',
      },
    ],
    handler: './apps/link',
  },
  unlink: {
    optionalArgs: 'app',
    description: 'Unlink an app on the current directory or a specified one',
    options: [
      {
        short: 'a',
        long: 'all',
        description: 'Unlink all apps',
        type: 'boolean',
      },
    ],
    handler: './apps/unlink',
  },
  add: {
    requiredArgs: 'app',
    description: 'Add app(s) to the manifest dependencies',
    handler: './apps/add',
  },
  publish: {
    description: 'Publish the current app or a path containing an app',
    optionalArgs: 'path',
    options: [
      {
        short: 't',
        long: 'tag',
        description: 'Apply a tag to the release',
        type: 'string',
      },
      {
        short: 'r',
        long: 'registry',
        description: 'Specify the account for the app registry',
        type: 'string',
      },
      {
        short: 'w',
        long: 'workspace',
        description: 'Specify the workspace for the app registry',
        type: 'string',
      },
      {
        short: 'p',
        long: 'public',
        description: 'Use the public registry (smartcheckout)',
        type: 'boolean',
      },
    ],
    handler: './apps/publish',
  },
  deprecate: {
    optionalArgs: 'app',
    description: 'Deprecate app(s)',
    options: [
      {
        short: 'r',
        long: 'registry',
        description: 'Specify the registry for the app(s)',
        type: 'string',
      },
      {
        short: 'p',
        long: 'public',
        description: 'Use the public registry (smartcheckout)',
        type: 'boolean',
      },
    ],
    handler: './apps/deprecate',
  },
  install: {
    alias: 'i',
    optionalArgs: 'app',
    description: 'Install an app (defaults to the app in the current directory)',
    options: [
      {
        short: 'r',
        long: 'registry',
        description: 'Specify the registry for the app',
        type: 'string',
      },
    ],
    handler: './apps/install',
  },
  uninstall: {
    optionalArgs: 'app',
    description: 'Uninstall an app (defaults to the app in the current directory)',
    options: [
      {
        short: 'y',
        long: 'yes',
        description: 'Auto confirm prompts',
        type: 'boolean',
      },
    ],
    handler: './apps/uninstall',
  },
  list: {
    alias: 'ls',
    description: 'List your installed VTEX apps',
    handler: './apps/list',
  },
  update: {
    description: 'Update all installed apps to the latest version',
    handler: './apps/update',
  },
  settings: {
    description: 'Get app settings',
    requiredArgs: 'app',
    optionalArgs: 'fields',
    handler: './apps/settings',
    set: {
      description: 'Set a value',
      requiredArgs: ['app', 'fields', 'value'],
      handler: './apps/settings/set',
    },
    unset: {
      description: 'Unset a value',
      requiredArgs: ['app', 'fields'],
      handler: './apps/settings/unset',
    },
  },
  login: {
    description: 'Log into a VTEX account',
    options: [
      {
        short: 'a',
        long: 'account',
        description: 'Specify login account',
        type: 'string',
      },
      {
        short: 'w',
        long: 'workspace',
        description: 'Specify login workspace',
        type: 'string',
      },
    ],
    handler: './auth/login',
  },
  logout: {
    description: 'Logout of the current VTEX account',
    handler: './auth/logout',
  },
  switch: {
    requiredArgs: 'account',
    description: 'Switch to another VTEX account',
    options: [
      {
        short: 'w',
        long: 'workspace',
        description: 'Specify login workspace',
        type: 'string',
      },
    ],
    handler: './auth/switch',
  },
  whoami: {
    description: 'See your credentials current status',
    handler: './auth/whoami',
  },
  workspace: {
    list: {
      alias: 'ls',
      description: 'List workspaces on this account',
      handler: './workspace/list',
    },
    create: {
      requiredArgs: 'name',
      description: 'Create a new workspace with this name',
      handler: './workspace/create',
    },
    delete: {
      requiredArgs: 'name',
      description: 'Delete a single or various workspaces',
      options: [
        {
          short: 'y',
          long: 'yes',
          description: 'Auto confirm prompts',
          type: 'boolean',
        },
        {
          short: 'f',
          long: 'force',
          description: 'Ignore if you\'re currently using the workspace',
          type: 'boolean',
        },
      ],
      handler: './workspace/delete',
    },
    promote: {
      description: 'Promote this workspace to master',
      handler: './workspace/promote',
    },
    production: {
      optionalArgs: 'production',
      description: 'Set this workspace to production mode',
      handler: './workspace/production',
    },
    use: {
      requiredArgs: 'name',
      description: 'Use a workspace to perform operations',
      options: [
        {
          short: 'r',
          long: 'reset',
          description: 'Resets workspace before using it',
          type: 'boolean',
        },
      ],
      handler: './workspace/use',
    },
    reset: {
      optionalArgs: 'name',
      description: 'Delete and create a workspace',
      handler: './workspace/reset',
    },
  },
  deps: {
    list: {
      alias: 'ls',
      description: 'List your workspace dependencies',
      options: [
        {
          short: 'n',
          long: 'npm',
          description: 'Include deps from npm registry',
          type: 'boolean',
        },
        {
          short: 'k',
          long: 'keys',
          description: 'Show only keys',
          type: 'boolean',
        },
      ],
      handler: './deps/list',
    },
    update: {
      description: 'Update all workspace dependencies or a specific app@version',
      optionalArgs: ['app'],
      handler: './deps/update',
    },
  },
  local: {
    eslint: {
      description: 'Setup a local eslint environment',
      options: [
        {
          short: 'y',
          long: 'yes',
          description: 'Auto confirm prompts',
          type: 'boolean',
        },
      ],
      handler: './local/eslint',
    },
    package: {
      description: 'Generate package.json from manifest',
      handler: './local/package',
    },
    manifest: {
      description: 'Generate manifest from package.json',
      handler: './local/manifest',
    },
    debug: {
      description: 'Run a Colossus function locally',
      handler: './local/debug',
    },
    token: {
      description: 'Show user\'s auth token and copy it to clipboard',
      handler: './local/token',
    },
  },
  init: {
    description: 'Create basic files and folders for your VTEX app',
    handler: './init',
    render: {
      description: 'Create a new render bootstrap project',
      handler: './init/render',
    },
    service: {
      description: 'Create a new service bootstrap project',
      handler: './init/service',
    },
    functions: {
      description: 'Create a new functions bootstrap project',
      handler: './init/functions',
    },
  },
  infra: {
    list: {
      alias: 'ls',
      optionalArgs: 'name',
      description: 'List installed services',
      options: [
        {
          short: 'a',
          long: 'available',
          description: 'List services available to install',
          type: 'bool',
        }, {
          short: 'f',
          long: 'filter',
          description: 'Only list versions containing this word',
          type: 'string',
        },
      ],
      handler: './infra/list',
    },
    install: {
      alias: 'i',
      requiredArgs: 'name',
      description: 'Install a service',
      handler: './infra/install',
    },
    update: {
      description: 'Update all installed services',
      handler: './infra/update',
    },
  },
  io: {
    list: {
      alias: 'ls',
      description: 'List VTEX IO versions available to install',
      options: [
        {
          short: 'a',
          long: 'available',
          description: 'List services available to install',
          type: 'bool',
        }, {
          short: 't',
          long: 'tag',
          description: 'Filter by tag',
          type: 'string',
        },
      ],
      handler: './io/list',
    },
    install: {
      alias: 'i',
      optionalArgs: 'version',
      description: 'Install VTEX IO Version',
      options: [
        {
          short: 't',
          long: 'tag',
          description: 'Install last version by Tag',
          type: 'string',
        },
      ],
      handler: './io/install',
    },
  },
  use: {
    requiredArgs: 'name',
    description: 'Use a workspace to perform operations',
    handler: './workspace/use',
  },
  options: [
    {
      short: 'h',
      long: 'help',
      description: 'show help information',
      type: 'boolean',
    },
  ],
  handler: './',
}
