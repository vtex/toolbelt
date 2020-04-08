VTEX
====

The platform for e-commerce apps

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/vtex.svg)](https://npmjs.org/package/vtex)
[![Downloads/week](https://img.shields.io/npm/dw/vtex.svg)](https://npmjs.org/package/vtex)
[![License](https://img.shields.io/npm/l/vtex.svg)](https://github.com/vtex/toolbelt/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g vtex
$ vtex COMMAND
running command...
$ vtex (-v|--version|version)
vtex/3.0.0-alpha darwin-x64 node-v12.4.0
$ vtex --help [COMMAND]
USAGE
  $ vtex COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`vtex apps:add APPID`](#vtex-appsadd-appid)
* [`vtex apps:deploy [APPID]`](#vtex-appsdeploy-appid)
* [`vtex apps:deprecate APPID`](#vtex-appsdeprecate-appid)
* [`vtex apps:infra:install SERVICEID`](#vtex-appsinfrainstall-serviceid)
* [`vtex apps:infra:list [NAME]`](#vtex-appsinfralist-name)
* [`vtex apps:init`](#vtex-appsinit)
* [`vtex apps:install [APPID]`](#vtex-appsinstall-appid)
* [`vtex apps:link`](#vtex-appslink)
* [`vtex apps:list`](#vtex-appslist)
* [`vtex apps:publish`](#vtex-appspublish)
* [`vtex apps:release [RELEASETYPE] [TAGNAME]`](#vtex-appsrelease-releasetype-tagname)
* [`vtex apps:settings:get APPNAME [OPTIONS]`](#vtex-appssettingsget-appname-options)
* [`vtex apps:settings:set APPNAME FIELD VALUE`](#vtex-appssettingsset-appname-field-value)
* [`vtex apps:settings:unset APPNAME FIELD`](#vtex-appssettingsunset-appname-field)
* [`vtex apps:undeprecate APPID`](#vtex-appsundeprecate-appid)
* [`vtex apps:uninstall [APPNAME]`](#vtex-appsuninstall-appname)
* [`vtex apps:unlink [APPID]`](#vtex-appsunlink-appid)
* [`vtex auth:account`](#vtex-authaccount)
* [`vtex auth:login [ACCOUNT] [WORKSPACE]`](#vtex-authlogin-account-workspace)
* [`vtex auth:logout`](#vtex-authlogout)
* [`vtex auth:support ACCOUNT`](#vtex-authsupport-account)
* [`vtex auth:switch ACCOUNT [WORKSPACE]`](#vtex-authswitch-account-workspace)
* [`vtex auth:token`](#vtex-authtoken)
* [`vtex auth:url`](#vtex-authurl)
* [`vtex auth:whoami`](#vtex-authwhoami)
* [`vtex auth:workspace`](#vtex-authworkspace)
* [`vtex browse [ENDPOINTINPUT]`](#vtex-browse-endpointinput)
* [`vtex config:get CONFIGNAME`](#vtex-configget-configname)
* [`vtex config:set CONFIGNAME VALUE`](#vtex-configset-configname-value)
* [`vtex debug:dotnet DEBUGINST`](#vtex-debugdotnet-debuginst)
* [`vtex edition:get`](#vtex-editionget)
* [`vtex edition:set EDITION`](#vtex-editionset-edition)
* [`vtex help [COMMAND]`](#vtex-help-command)
* [`vtex redirects:delete CSVPATH`](#vtex-redirectsdelete-csvpath)
* [`vtex redirects:export CSVPATH`](#vtex-redirectsexport-csvpath)
* [`vtex redirects:import CSVPATH`](#vtex-redirectsimport-csvpath)
* [`vtex setup`](#vtex-setup)
* [`vtex test`](#vtex-test)
* [`vtex test:ab:finish`](#vtex-testabfinish)
* [`vtex test:ab:start`](#vtex-testabstart)
* [`vtex test:ab:status`](#vtex-testabstatus)
* [`vtex test:e2e`](#vtex-teste2e)
* [`vtex workspace:create [WORKSPACENAME]`](#vtex-workspacecreate-workspacename)
* [`vtex workspace:delete WORKSPACE1 [ITHWORKSPACE]`](#vtex-workspacedelete-workspace1-ithworkspace)
* [`vtex workspace:deps:diff [WORKSPACE1] [WORKSPACE2]`](#vtex-workspacedepsdiff-workspace1-workspace2)
* [`vtex workspace:deps:list`](#vtex-workspacedepslist)
* [`vtex workspace:deps:update [APPID]`](#vtex-workspacedepsupdate-appid)
* [`vtex workspace:info`](#vtex-workspaceinfo)
* [`vtex workspace:infra:update`](#vtex-workspaceinfraupdate)
* [`vtex workspace:list`](#vtex-workspacelist)
* [`vtex workspace:promote`](#vtex-workspacepromote)
* [`vtex workspace:reset [WORKSPACENAME]`](#vtex-workspacereset-workspacename)
* [`vtex workspace:status [WORKSPACENAME]`](#vtex-workspacestatus-workspacename)
* [`vtex workspace:update`](#vtex-workspaceupdate)
* [`vtex workspace:use WORKSPACE`](#vtex-workspaceuse-workspace)

## `vtex apps:add APPID`

Add app(s) to the manifest dependencies

```
USAGE
  $ vtex apps:add APPID

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex add

EXAMPLES
  vtex apps:add vtex.service-example@0.x
  vtex add vtex.service-example@0.x
```

_See code: [src/commands/apps/add.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/add.ts)_

## `vtex apps:deploy [APPID]`

Deploy a release of an app

```
USAGE
  $ vtex apps:deploy [APPID]

OPTIONS
  -h, --help  show CLI help
  -y, --yes   Answer yes to confirmation prompts

ALIASES
  $ vtex deploy

EXAMPLES
  vtex apps:deploy
  vtex deploy
  vtex deploy vtex.service-example@0.0.1
```

_See code: [src/commands/apps/deploy.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/deploy.ts)_

## `vtex apps:deprecate APPID`

Deprecate an app

```
USAGE
  $ vtex apps:deprecate APPID

OPTIONS
  -h, --help  show CLI help
  -y, --yes   Confirm all prompts

ALIASES
  $ vtex deprecate

EXAMPLES
  vtex apps:deprecate vtex.service-example@0.0.1
  vtex deprecate vtex.service-example@0.0.1
```

_See code: [src/commands/apps/deprecate.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/deprecate.ts)_

## `vtex apps:infra:install SERVICEID`

Install an infra service

```
USAGE
  $ vtex apps:infra:install SERVICEID

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex infra:install

EXAMPLES
  vtex apps:infra:install infra-service
  vtex infra:install infra-service
  vtex infra:install infra-service@0.0.1
```

_See code: [src/commands/apps/infra/install.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/infra/install.ts)_

## `vtex apps:infra:list [NAME]`

List installed infra services

```
USAGE
  $ vtex apps:infra:list [NAME]

OPTIONS
  -a, --available      List services available to install
  -f, --filter=filter  Only list versions containing this word
  -h, --help           show CLI help

ALIASES
  $ vtex apps:infra:ls
  $ vtex infra:list
  $ vtex infra:ls

EXAMPLES
  vtex apps:infra:list
  vtex infra:list
  vtex infra:ls
  vtex infra:ls infraService
```

_See code: [src/commands/apps/infra/list.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/infra/list.ts)_

## `vtex apps:init`

Create basic files and folders for your VTEX app

```
USAGE
  $ vtex apps:init

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex init

EXAMPLES
  vtex apps:init
  vtex init
```

_See code: [src/commands/apps/init.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/init.ts)_

## `vtex apps:install [APPID]`

Install an app (defaults to the app in the current directory)

```
USAGE
  $ vtex apps:install [APPID]

OPTIONS
  -f, --force  Install app without checking for route conflicts
  -h, --help   show CLI help

ALIASES
  $ vtex install

EXAMPLES
  vtex apps:install
  vtex install
  vtex apps:install vtex.service-example@0.x
  vtex apps:install vtex.service-example@0.0.1
```

_See code: [src/commands/apps/install.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/install.ts)_

## `vtex apps:link`

Start a development session for this app

```
USAGE
  $ vtex apps:link

OPTIONS
  -c, --clean   Clean builder cache
  -h, --help    show CLI help
  -s, --setup   Do not add app dependencies to package.json and do not run Yarn
  -u, --unsafe  Allow links with Typescript errors
  --no-watch    Don't watch for file changes after initial link

ALIASES
  $ vtex link
```

_See code: [src/commands/apps/link.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/link.ts)_

## `vtex apps:list`

List your installed VTEX apps

```
USAGE
  $ vtex apps:list

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex ls
  $ vtex list
  $ vtex apps:ls

EXAMPLES
  vtex apps:list
  vtex list
  vtex apps:ls
  vtex ls
```

_See code: [src/commands/apps/list.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/list.ts)_

## `vtex apps:publish`

Publish the current app or a path containing an app

```
USAGE
  $ vtex apps:publish

OPTIONS
  -f, --force                Publish app without checking if the semver is being respected
  -h, --help                 show CLI help
  -t, --tag=tag              Apply a tag to the release
  -w, --workspace=workspace  Specify the workspace for the app registry
  -y, --yes                  Answer yes to confirmation prompts

ALIASES
  $ vtex publish

EXAMPLES
  vtex apps:publish
  vtex publish
```

_See code: [src/commands/apps/publish.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/publish.ts)_

## `vtex apps:release [RELEASETYPE] [TAGNAME]`

Bump app version, commit and push to remote. Only for git users. The first option can also be a specific valid semver version

```
USAGE
  $ vtex apps:release [RELEASETYPE] [TAGNAME]

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex release

EXAMPLES
  vtex apps:release
  vtex release
  vtex release patch
  vtex release patch beta
  vtex release minor stable
  vtex release pre
```

_See code: [src/commands/apps/release.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/release.ts)_

## `vtex apps:settings:get APPNAME [OPTIONS]`

Get app settings

```
USAGE
  $ vtex apps:settings:get APPNAME [OPTIONS]

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex settings
  $ vtex settings:get

EXAMPLES
  vtex apps:settings:get vtex.service-example
  vtex settings:get vtex.service-example
```

_See code: [src/commands/apps/settings/get.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/settings/get.ts)_

## `vtex apps:settings:set APPNAME FIELD VALUE`

Set app settings

```
USAGE
  $ vtex apps:settings:set APPNAME FIELD VALUE

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex settings:set

EXAMPLES
  vtex-test apps:settings:set vtex.service-example fieldName fieldValue
  vtex-test settings:set vtex.service-example fieldName fieldValue
```

_See code: [src/commands/apps/settings/set.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/settings/set.ts)_

## `vtex apps:settings:unset APPNAME FIELD`

Unset app settings

```
USAGE
  $ vtex apps:settings:unset APPNAME FIELD

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex settings:unset

EXAMPLES
  vtex apps:settings:unset vtex.service-example fieldName
  vtex settings:unset vtex.service-example fieldName
```

_See code: [src/commands/apps/settings/unset.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/settings/unset.ts)_

## `vtex apps:undeprecate APPID`

Undeprecate app

```
USAGE
  $ vtex apps:undeprecate APPID

OPTIONS
  -h, --help  show CLI help
  -y, --yes   Confirm all prompts

ALIASES
  $ vtex undeprecate

EXAMPLES
  vtex apps:undeprecate vtex.service-example@0.0.1
  vtex undeprecate vtex.service-example@0.0.1
```

_See code: [src/commands/apps/undeprecate.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/undeprecate.ts)_

## `vtex apps:uninstall [APPNAME]`

Uninstall an app (defaults to the app in the current directory)

```
USAGE
  $ vtex apps:uninstall [APPNAME]

OPTIONS
  -h, --help  show CLI help
  -y, --yes   Auto confirm prompts

ALIASES
  $ vtex uninstall

EXAMPLES
  vtex apps:uninstall
  vtex uninstall
  vtex apps:uninstall vtex.service-example
  vtex apps:uninstall vtex.service-example@0.x
```

_See code: [src/commands/apps/uninstall.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/uninstall.ts)_

## `vtex apps:unlink [APPID]`

Unlink an app on the current directory or a specified one

```
USAGE
  $ vtex apps:unlink [APPID]

OPTIONS
  -a, --all   Unlink all apps
  -h, --help  show CLI help

ALIASES
  $ vtex unlink

EXAMPLES
  vtex unlink
  vtex apps:unlink
  vtex unlink vtex.service-example@0.x
  vtex apps:unlink vtex.service-example@0.x
```

_See code: [src/commands/apps/unlink.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/apps/unlink.ts)_

## `vtex auth:account`

Show current account and copy it to clipboard

```
USAGE
  $ vtex auth:account

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex account

EXAMPLES
  vtex auth:account
  vtex account
```

_See code: [src/commands/auth/account.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/auth/account.ts)_

## `vtex auth:login [ACCOUNT] [WORKSPACE]`

Log into a VTEX account

```
USAGE
  $ vtex auth:login [ACCOUNT] [WORKSPACE]

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex login

EXAMPLES
  vtex auth:login
  vtex login
  vtex login storecomponents
  vtex login storecomponents myworkspace
```

_See code: [src/commands/auth/login.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/auth/login.ts)_

## `vtex auth:logout`

Logout of the current VTEX account

```
USAGE
  $ vtex auth:logout

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex logout

EXAMPLES
  vtex auth:logout
  vtex logout
```

_See code: [src/commands/auth/logout.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/auth/logout.ts)_

## `vtex auth:support ACCOUNT`

Login as support into another VTEX account

```
USAGE
  $ vtex auth:support ACCOUNT

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex support

EXAMPLES
  vtex auth:support storecomponents
  vtex auth:support
```

_See code: [src/commands/auth/support.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/auth/support.ts)_

## `vtex auth:switch ACCOUNT [WORKSPACE]`

Switch to another VTEX account

```
USAGE
  $ vtex auth:switch ACCOUNT [WORKSPACE]

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex switch

EXAMPLES
  vtex auth:switch storecomponents
  vtex switch storecomponents
  vtex switch storecomponents myworkspace
```

_See code: [src/commands/auth/switch.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/auth/switch.ts)_

## `vtex auth:token`

Show user's auth token and copy it to clipboard

```
USAGE
  $ vtex auth:token

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex token

EXAMPLES
  vtex auth:token
  vtex token
```

_See code: [src/commands/auth/token.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/auth/token.ts)_

## `vtex auth:url`

Prints base URL for current account, workspace and environment

```
USAGE
  $ vtex auth:url

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex url

EXAMPLES
  vtex auth:url
  vtex url
```

_See code: [src/commands/auth/url.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/auth/url.ts)_

## `vtex auth:whoami`

See your credentials current status

```
USAGE
  $ vtex auth:whoami

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex whoami

EXAMPLES
  vtex auth:whoami
  vtex whoami
```

_See code: [src/commands/auth/whoami.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/auth/whoami.ts)_

## `vtex auth:workspace`

Show current workspace and copy it to clipboard

```
USAGE
  $ vtex auth:workspace

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex workspace

EXAMPLES
  vtex auth:workspace
  vtex workspace
```

_See code: [src/commands/auth/workspace.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/auth/workspace.ts)_

## `vtex browse [ENDPOINTINPUT]`

Add app(s) to the manifest dependencies

```
USAGE
  $ vtex browse [ENDPOINTINPUT]

OPTIONS
  -h, --help  show CLI help
  -q, --qr    Outputs a QR Code on the terminal

EXAMPLE
  vtex browse
```

_See code: [src/commands/browse.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/browse.ts)_

## `vtex config:get CONFIGNAME`

Gets the current value for the requested configuration

```
USAGE
  $ vtex config:get CONFIGNAME

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex apps:config:get env
  vtex config:get env
  vtex config:get cluster
```

_See code: [src/commands/config/get.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/config/get.ts)_

## `vtex config:set CONFIGNAME VALUE`

Sets the current value for the given configuration

```
USAGE
  $ vtex config:set CONFIGNAME VALUE

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex apps:config:set env envValue
  vtex config:set cluster clusterValue
```

_See code: [src/commands/config/set.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/config/set.ts)_

## `vtex debug:dotnet DEBUGINST`

Debug for .NET applications

```
USAGE
  $ vtex debug:dotnet DEBUGINST

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex debig:dotnet debugInst
```

_See code: [src/commands/debug/dotnet.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/debug/dotnet.ts)_

## `vtex edition:get`

Get edition of the current account

```
USAGE
  $ vtex edition:get

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex edition:get
```

_See code: [src/commands/edition/get.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/edition/get.ts)_

## `vtex edition:set EDITION`

Set edition of the current account

```
USAGE
  $ vtex edition:set EDITION

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex edition:set editionName
```

_See code: [src/commands/edition/set.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/edition/set.ts)_

## `vtex help [COMMAND]`

display help for vtex

```
USAGE
  $ vtex help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `vtex redirects:delete CSVPATH`

Delete redirects in the current account and workspace

```
USAGE
  $ vtex redirects:delete CSVPATH

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex redirects:delete csvPath
```

_See code: [src/commands/redirects/delete.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/redirects/delete.ts)_

## `vtex redirects:export CSVPATH`

Export all redirects in the current account and workspace

```
USAGE
  $ vtex redirects:export CSVPATH

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex redirects:export csvPath
```

_See code: [src/commands/redirects/export.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/redirects/export.ts)_

## `vtex redirects:import CSVPATH`

Import redirects for the current account and workspace

```
USAGE
  $ vtex redirects:import CSVPATH

OPTIONS
  -h, --help   show CLI help
  -r, --reset  Remove all previous redirects

EXAMPLE
  vtex redirects:import csvPath
```

_See code: [src/commands/redirects/import.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/redirects/import.ts)_

## `vtex setup`

Download react app typings, graphql app typings, lint config and tsconfig

```
USAGE
  $ vtex setup

OPTIONS
  -h, --help           show CLI help
  -i, --ignore-linked  Add only types from apps published

EXAMPLE
  vtex setup
```

_See code: [src/commands/setup/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/setup/index.ts)_

## `vtex test`

Run your VTEX app unit tests

```
USAGE
  $ vtex test

OPTIONS
  -h, --help    show CLI help
  -u, --unsafe  Allow tests with Typescript errors
```

_See code: [src/commands/test/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/test/index.ts)_

## `vtex test:ab:finish`

Stop all AB testing in current account

```
USAGE
  $ vtex test:ab:finish

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/test/ab/finish.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/test/ab/finish.ts)_

## `vtex test:ab:start`

Start AB testing with current workspace

```
USAGE
  $ vtex test:ab:start

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/test/ab/start.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/test/ab/start.ts)_

## `vtex test:ab:status`

Display currently running AB tests results

```
USAGE
  $ vtex test:ab:status

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/test/ab/status.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/test/ab/status.ts)_

## `vtex test:e2e`

Start a development session for this app

```
USAGE
  $ vtex test:e2e

OPTIONS
  -h, --help           show CLI help
  -r, --report=report  Check the results and state of a previously started test given its ID

  -t, --token          [Not recommended] Send your personal authorization token to your test session so it's available
                       while running the tests. It can be dangerous because exposes the token via 'authToken'
                       environment variable

  -w, --workspace      Test workspace's apps

ALIASES
  $ vtex e2e
  $ vtex test:e2e
```

_See code: [src/commands/test/e2e.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/test/e2e.ts)_

## `vtex workspace:create [WORKSPACENAME]`

Create a new workspace with this name

```
USAGE
  $ vtex workspace:create [WORKSPACENAME]

OPTIONS
  -h, --help        show CLI help
  -p, --production  Create a production workspace

EXAMPLE
  vtex workspace:create workspaceName
```

_See code: [src/commands/workspace/create.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/create.ts)_

## `vtex workspace:delete WORKSPACE1 [ITHWORKSPACE]`

Delete one or many workspaces

```
USAGE
  $ vtex workspace:delete WORKSPACE1 [ITHWORKSPACE]

OPTIONS
  -f, --force=force  Ignore if you're currently using the workspace
  -h, --help         show CLI help
  -y, --yes          Answer yes to confirmation prompts

EXAMPLES
  vtex workspace:delete workspaceName
  vtex workspace:delete workspaceName1 workspaceName2
```

_See code: [src/commands/workspace/delete.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/delete.ts)_

## `vtex workspace:deps:diff [WORKSPACE1] [WORKSPACE2]`

Diff between workspace dependencies. If only a parameter is passed the current workspace is used in the diff and if no parameter is passed the diff is made between the current workspace and master.

```
USAGE
  $ vtex workspace:deps:diff [WORKSPACE1] [WORKSPACE2]

ALIASES
  $ vtex diff

EXAMPLES
  vtex workspace:diff workspace1 workspace2
  vtex diff workspace1 workspace2
  vtex diff workspace1
  vtex diff
```

_See code: [src/commands/workspace/deps/diff.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/deps/diff.ts)_

## `vtex workspace:deps:list`

List your workspace dependencies

```
USAGE
  $ vtex workspace:deps:list

OPTIONS
  -k, --keys  Show only keys

ALIASES
  $ vtex workspace:deps:ls
  $ vtex deps:list
  $ vtex deps:ls

EXAMPLES
  vtex workspace:deps:list
  vtex workspace:deps:ls
  vtex deps:list
  vtex deps:ls
```

_See code: [src/commands/workspace/deps/list.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/deps/list.ts)_

## `vtex workspace:deps:update [APPID]`

Update all workspace dependencies or a specific app@version

```
USAGE
  $ vtex workspace:deps:update [APPID]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLES
  vtex workspace:update
  vtex update vtex.service-example@0.0.1
```

_See code: [src/commands/workspace/deps/update.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/deps/update.ts)_

## `vtex workspace:info`

Display information about the current workspace

```
USAGE
  $ vtex workspace:info

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex info

EXAMPLES
  vtex workspace:info
  vtex info
```

_See code: [src/commands/workspace/info.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/info.ts)_

## `vtex workspace:infra:update`

Update all installed infra services

```
USAGE
  $ vtex workspace:infra:update

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex infra:update

EXAMPLES
  vtex workspace:infra:update
  vtex infra:update
```

_See code: [src/commands/workspace/infra/update.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/infra/update.ts)_

## `vtex workspace:list`

List workspaces on this account

```
USAGE
  $ vtex workspace:list

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex workspace:ls

EXAMPLES
  vtex workspace:list
  vtex workspace:ls
```

_See code: [src/commands/workspace/list.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/list.ts)_

## `vtex workspace:promote`

Promote this workspace to master

```
USAGE
  $ vtex workspace:promote

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex promote

EXAMPLES
  vtex workspace:promote
  vtex promote
```

_See code: [src/commands/workspace/promote.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/promote.ts)_

## `vtex workspace:reset [WORKSPACENAME]`

Delete and recreate a workspace

```
USAGE
  $ vtex workspace:reset [WORKSPACENAME]

OPTIONS
  -h, --help        show CLI help
  -p, --production  Re-create the workspace as a production one
  -y, --yes         Answer yes to confirmation prompts

EXAMPLES
  vtex workspace:reset
  vtex workspace:reset workspaceName
```

_See code: [src/commands/workspace/reset.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/reset.ts)_

## `vtex workspace:status [WORKSPACENAME]`

Display information about a workspace

```
USAGE
  $ vtex workspace:status [WORKSPACENAME]

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex workspace:status
```

_See code: [src/commands/workspace/status.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/status.ts)_

## `vtex workspace:update`

Update all installed apps to the latest (minor or patch) version

```
USAGE
  $ vtex workspace:update

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex update

EXAMPLES
  vtex workspace:update
  vtex update
```

_See code: [src/commands/workspace/update.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/update.ts)_

## `vtex workspace:use WORKSPACE`

Use a workspace to perform operations

```
USAGE
  $ vtex workspace:use WORKSPACE

OPTIONS
  -h, --help        show CLI help
  -p, --production  Create the workspace as production if it does not exist or is reset
  -r, --reset       Resets workspace before using it

ALIASES
  $ vtex use

EXAMPLES
  vtex workspace:use workspaceName
  vtex use worspaceName
```

_See code: [src/commands/workspace/use.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha/src/commands/workspace/use.ts)_
<!-- commandsstop -->
