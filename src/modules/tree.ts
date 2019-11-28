export default {
  add: {
    description: 'Add app(s) to the manifest dependencies',
    handler: './apps/add',
    requiredArgs: 'app',
  },
  config: {
    get: {
      description: 'Gets the current value for the requested configuration',
      handler: './config/get',
      requiredArgs: 'name',
    },
    set: {
      description: 'Sets the current value for the given configuration',
      handler: './config/set',
      requiredArgs: ['name', 'value'],
    },
  },
  browse: {
    description: 'Open endpoint in browser window',
    handler: './browse',
    optionalArgs: ['endpoint'],
    options: [
      {
        description: 'Outputs a QR Code on the terminal',
        long: 'qr',
        short: 'q',
        type: 'boolean',
      },
    ],
  },
  deprecate: {
    description: 'Deprecate app(s)',
    handler: './apps/deprecate',
    optionalArgs: 'app',
  },
  undeprecate: {
    description: 'Undeprecate app(s)',
    handler: './apps/undeprecate',
    optionalArgs: 'app',
  },
  deps: {
    list: {
      alias: 'ls',
      description: 'List your workspace dependencies',
      handler: './deps/list',
      options: [
        {
          description: 'Include deps from npm registry',
          long: 'npm',
          short: 'n',
          type: 'boolean',
        },
        {
          description: 'Show only keys',
          long: 'keys',
          short: 'k',
          type: 'boolean',
        },
      ],
    },
    update: {
      description: 'Update all workspace dependencies or a specific app@version',
      handler: './deps/update',
      optionalArgs: ['app'],
    },
    diff: {
      description: 'Diff between workspace dependencies',
      handler: './deps/diff',
      optionalArgs: ['workspace1', 'workspace2'],
    },
  },
  handler: './',
  infra: {
    install: {
      alias: 'i',
      description: 'Install a service',
      handler: './infra/install',
      requiredArgs: 'name',
    },
    list: {
      alias: 'ls',
      description: 'List installed services',
      handler: './infra/list',
      optionalArgs: 'name',
      options: [
        {
          description: 'List services available to install',
          long: 'available',
          short: 'a',
          type: 'bool',
        },
        {
          description: 'Only list versions containing this word',
          long: 'filter',
          short: 'f',
          type: 'string',
        },
      ],
    },
    update: {
      description: 'Update all installed services',
      handler: './infra/update',
    },
  },
  init: {
    description: 'Create basic files and folders for your VTEX app',
    handler: './init',
  },
  install: {
    alias: 'i',
    description: 'Install an app (defaults to the app in the current directory)',
    handler: './apps/install',
    options: [
      {
        description: 'Install app without checking for route conflicts',
        long: 'force',
        short: 'f',
        type: 'boolean',
      },
    ],
    optionalArgs: 'app',
  },
  setup: {
    description: 'Download react app typings, graphql app typings, lint config and tsconfig',
    handler: './setup',
    options: [
      {
        description: 'Add only types from apps published',
        long: 'ignore-linked',
        short: 'i',
        type: 'boolean',
      },
    ],
  },
  link: {
    description: 'Start a development session for this app',
    handler: './apps/link',
    options: [
      {
        description: 'Clean builder cache',
        long: 'clean',
        short: 'c',
        type: 'boolean',
      },
      {
        description: 'Do not add app dependencies to package.json and do not run Yarn',
        long: 'setup',
        short: 's',
        type: 'boolean',
      },
      {
        description: `Don't watch for file changes after initial link`,
        long: 'no-watch',
        type: 'boolean',
      },
      {
        description: 'Allow links with Typescript errors',
        long: 'unsafe',
        short: 'u',
        type: 'boolean',
      },
    ],
  },
  list: {
    alias: 'ls',
    description: 'List your installed VTEX apps',
    handler: './apps/list',
  },
  local: {
    manifest: {
      description: 'Generate manifest from package.json',
      handler: './local/manifest',
    },
    package: {
      description: 'Generate package.json from manifest',
      handler: './local/package',
    },
    account: {
      description: 'Show current account and copy it to clipboard',
      handler: './local/account',
    },
    workspace: {
      description: 'Show current workspace and copy it to clipboard',
      handler: './local/workspace',
    },
    token: {
      description: "Show user's auth token and copy it to clipboard",
      handler: './local/token',
    },
  },
  login: {
    description: 'Log into a VTEX account',
    handler: './auth/login',
    options: [
      {
        description: 'Specify login account',
        long: 'account',
        short: 'a',
        type: 'string',
      },
      {
        description: 'Specify login workspace',
        long: 'workspace',
        short: 'w',
        type: 'string',
      },
    ],
  },
  support: {
    description: 'Login as support into another VTEX account',
    handler: './support/login',
    requiredArgs: ['account'],
  },
  logout: {
    description: 'Logout of the current VTEX account',
    handler: './auth/logout',
  },
  options: [
    {
      description: 'show help information',
      long: 'help',
      short: 'h',
      type: 'boolean',
    },
  ],
  production: {
    description: "Set this workspace's production mode to true or false (deprecated)",
    handler: './workspace/production',
    optionalArgs: 'production',
  },
  promote: {
    description: 'Promote this workspace to master',
    handler: './workspace/promote',
  },
  publish: {
    description: 'Publish the current app or a path containing an app',
    handler: './apps/publish',
    optionalArgs: 'path',
    options: [
      {
        description: 'Apply a tag to the release',
        long: 'tag',
        short: 't',
        type: 'string',
      },
      {
        description: 'Specify the workspace for the app registry',
        long: 'workspace',
        short: 'w',
        type: 'string',
      },
      {
        description: 'Publish app without checking if the sem ver is being respected',
        long: 'force',
        short: 'f',
        type: 'boolean',
      },
    ],
  },
  settings: {
    description: 'Get app settings',
    handler: './apps/settings',
    optionalArgs: 'fields',
    requiredArgs: 'app',
    set: {
      description: 'Set a value',
      handler: './apps/settings/set',
      requiredArgs: ['app', 'fields', 'value'],
    },
    unset: {
      description: 'Unset a value',
      handler: './apps/settings/unset',
      requiredArgs: ['app', 'fields'],
    },
  },
  switch: {
    description: 'Switch to another VTEX account',
    handler: './auth/switch',
    options: [
      {
        description: 'Specify login workspace',
        long: 'workspace',
        short: 'w',
        type: 'string',
      },
    ],
    requiredArgs: 'account',
  },
  test: {
    description: 'Run your VTEX app unit tests',
    handler: './apps/test',
    options: [
      {
        description: 'Allow tests with Typescript errors',
        long: 'unsafe',
        short: 'u',
        type: 'boolean',
      },
    ],
  },
  uninstall: {
    description: 'Uninstall an app (defaults to the app in the current directory)',
    handler: './apps/uninstall',
    optionalArgs: 'app',
    options: [
      {
        description: 'Auto confirm prompts',
        long: 'yes',
        short: 'y',
        type: 'boolean',
      },
    ],
  },
  unlink: {
    description: 'Unlink an app on the current directory or a specified one',
    handler: './apps/unlink',
    optionalArgs: 'app',
    options: [
      {
        description: 'Unlink all apps',
        long: 'all',
        short: 'a',
        type: 'boolean',
      },
    ],
  },
  update: {
    description: 'Update all installed apps to the latest (minor or patch) version',
    handler: './housekeeper/update',
  },
  use: {
    description: 'Use a workspace to perform operations',
    handler: './workspace/use',
    requiredArgs: 'name',
    options: [
      {
        description: 'If workspace does not exist, whether to create it as a production workspace',
        long: 'production',
        short: 'p',
        type: 'boolean',
      },
    ],
  },
  whoami: {
    description: 'See your credentials current status',
    handler: './auth/whoami',
  },
  workspace: {
    abtest: {
      start: {
        description: 'Start AB testing with current workspace',
        handler: './workspace/abtest/start',
      },
      finish: {
        description: 'Stop all AB testing in current account',
        handler: './workspace/abtest/finish',
      },
      status: {
        description: 'Display currently running AB tests results',
        handler: './workspace/abtest/status',
      },
    },
    create: {
      description: 'Create a new workspace with this name',
      handler: './workspace/create',
      requiredArgs: 'name',
      options: [
        {
          description: 'Create a production workspace',
          long: 'production',
          short: 'p',
          type: 'boolean',
        },
      ],
    },
    delete: {
      description: 'Delete a single or various workspaces',
      handler: './workspace/delete',
      options: [
        {
          description: 'Auto confirm prompts',
          long: 'yes',
          short: 'y',
          type: 'boolean',
        },
        {
          description: "Ignore if you're currently using the workspace",
          long: 'force',
          short: 'f',
          type: 'boolean',
        },
      ],
      requiredArgs: 'name',
    },
    description: 'Alias for vtex workspace info',
    handler: './workspace/info',
    info: {
      description: 'Display information about the current workspace',
      handler: './workspace/info',
    },
    list: {
      alias: 'ls',
      description: 'List workspaces on this account',
      handler: './workspace/list',
    },
    promote: {
      description: 'Promote this workspace to master',
      handler: './workspace/promote',
    },
    reset: {
      description: 'Delete and create a workspace',
      handler: './workspace/reset',
      optionalArgs: 'name',
      options: [
        {
          description: 'Whether to re-create the workspace as a production one',
          long: 'production',
          short: 'p',
          type: 'boolean',
        },
      ],
    },
    status: {
      description: 'Display information about a workspace',
      handler: './workspace/status',
      optionalArgs: 'name',
    },
    use: {
      description: 'Use a workspace to perform operations',
      handler: './workspace/use',
      options: [
        {
          description: 'Resets workspace before using it',
          long: 'reset',
          short: 'r',
          type: 'boolean',
        },
        {
          description: 'Whether to create the workspace as production if it does not exist or is reset',
          long: 'production',
          short: 'p',
          type: 'boolean',
        },
      ],
      requiredArgs: 'name',
    },
  },
  release: {
    description:
      'Bump app version, commit and push to remote. Only for git users. The first option can also be a specific valid semver version',
    handler: './release',
    optionalArgs: ['releaseType', 'tagName'],
  },
  url: {
    description: 'Prints base URL for current account, workspace and environment',
    handler: './url',
  },
  redirects: {
    import: {
      description: 'Import redirects for the current account and workspace',
      handler: './rewriter/import',
      requiredArgs: 'csvPath',
      options: [
        {
          description: 'Remove all previous redirects',
          long: 'reset',
          short: 'r',
          type: 'boolean',
        },
      ],
    },
    export: {
      description: 'Export all redirects in the current account and workspace',
      handler: './rewriter/export',
      requiredArgs: 'csvPath',
    },
    delete: {
      description: 'Delete redirects in the current account and workspace',
      handler: './rewriter/delete',
      requiredArgs: 'csvPath',
    },
  },
  edition: {
    description: 'Get edition of the current account',
    handler: './sponsor/getEdition',
    set: {
      description: 'Set edition of the current account',
      handler: './sponsor/setEdition',
      requiredArgs: 'edition',
    },
  },
}
