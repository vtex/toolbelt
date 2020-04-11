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
vtex/3.0.0-alpha.1 darwin-x64 node-v12.4.0
$ vtex --help [COMMAND]
USAGE
  $ vtex COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`vtex add APPID`](#vtex-add-appid)
* [`vtex browse [ENDPOINTINPUT]`](#vtex-browse-endpointinput)
* [`vtex config`](#vtex-config)
* [`vtex config:get CONFIGNAME`](#vtex-configget-configname)
* [`vtex config:set CONFIGNAME VALUE`](#vtex-configset-configname-value)
* [`vtex debug`](#vtex-debug)
* [`vtex debug:dotnet DEBUGINST`](#vtex-debugdotnet-debuginst)
* [`vtex deploy [APPID]`](#vtex-deploy-appid)
* [`vtex deprecate APPID`](#vtex-deprecate-appid)
* [`vtex deps`](#vtex-deps)
* [`vtex deps:diff [WORKSPACE1] [WORKSPACE2]`](#vtex-depsdiff-workspace1-workspace2)
* [`vtex deps:list`](#vtex-depslist)
* [`vtex deps:update [APPID]`](#vtex-depsupdate-appid)
* [`vtex edition`](#vtex-edition)
* [`vtex edition:get`](#vtex-editionget)
* [`vtex edition:set EDITION`](#vtex-editionset-edition)
* [`vtex help [COMMAND]`](#vtex-help-command)
* [`vtex infra`](#vtex-infra)
* [`vtex infra:install SERVICEID`](#vtex-infrainstall-serviceid)
* [`vtex infra:list [NAME]`](#vtex-infralist-name)
* [`vtex infra:update`](#vtex-infraupdate)
* [`vtex init`](#vtex-init)
* [`vtex install [APPID]`](#vtex-install-appid)
* [`vtex link`](#vtex-link)
* [`vtex list`](#vtex-list)
* [`vtex local`](#vtex-local)
* [`vtex local:account`](#vtex-localaccount)
* [`vtex local:token`](#vtex-localtoken)
* [`vtex local:workspace`](#vtex-localworkspace)
* [`vtex login [ACCOUNT] [WORKSPACE]`](#vtex-login-account-workspace)
* [`vtex logout`](#vtex-logout)
* [`vtex publish`](#vtex-publish)
* [`vtex redirects`](#vtex-redirects)
* [`vtex redirects:delete CSVPATH`](#vtex-redirectsdelete-csvpath)
* [`vtex redirects:export CSVPATH`](#vtex-redirectsexport-csvpath)
* [`vtex redirects:import CSVPATH`](#vtex-redirectsimport-csvpath)
* [`vtex release [RELEASETYPE] [TAGNAME]`](#vtex-release-releasetype-tagname)
* [`vtex settings`](#vtex-settings)
* [`vtex settings:get APPNAME [OPTIONS]`](#vtex-settingsget-appname-options)
* [`vtex settings:set APPNAME FIELD VALUE`](#vtex-settingsset-appname-field-value)
* [`vtex settings:unset APPNAME FIELD`](#vtex-settingsunset-appname-field)
* [`vtex setup`](#vtex-setup)
* [`vtex support ACCOUNT`](#vtex-support-account)
* [`vtex switch ACCOUNT [WORKSPACE]`](#vtex-switch-account-workspace)
* [`vtex test`](#vtex-test)
* [`vtex test:ab:finish`](#vtex-testabfinish)
* [`vtex test:ab:start`](#vtex-testabstart)
* [`vtex test:ab:status`](#vtex-testabstatus)
* [`vtex test:e2e`](#vtex-teste2e)
* [`vtex test:unit`](#vtex-testunit)
* [`vtex undeprecate APPID`](#vtex-undeprecate-appid)
* [`vtex uninstall [APPNAME]`](#vtex-uninstall-appname)
* [`vtex unlink [APPID]`](#vtex-unlink-appid)
* [`vtex update`](#vtex-update)
* [`vtex url`](#vtex-url)
* [`vtex whoami`](#vtex-whoami)
* [`vtex workspace`](#vtex-workspace)
* [`vtex workspace:create [WORKSPACENAME]`](#vtex-workspacecreate-workspacename)
* [`vtex workspace:delete WORKSPACE1 [ITHWORKSPACE]`](#vtex-workspacedelete-workspace1-ithworkspace)
* [`vtex workspace:info`](#vtex-workspaceinfo)
* [`vtex workspace:list`](#vtex-workspacelist)
* [`vtex workspace:promote`](#vtex-workspacepromote)
* [`vtex workspace:reset [WORKSPACENAME]`](#vtex-workspacereset-workspacename)
* [`vtex workspace:status [WORKSPACENAME]`](#vtex-workspacestatus-workspacename)
* [`vtex workspace:use WORKSPACE`](#vtex-workspaceuse-workspace)

## `vtex add APPID`

Add app(s) to the manifest dependencies

```
USAGE
  $ vtex add APPID

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex apps add vtex.service-example@0.x
  vtex add vtex.service-example@0.x
```

_See code: [src/commands/add.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/add.ts)_

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

_See code: [src/commands/browse.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/browse.ts)_

## `vtex config`

Config commands

```
USAGE
  $ vtex config

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/config/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/config/index.ts)_

## `vtex config:get CONFIGNAME`

Gets the current value for the requested configuration

```
USAGE
  $ vtex config:get CONFIGNAME

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex config get env
  vtex config get cluster
```

_See code: [src/commands/config/get.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/config/get.ts)_

## `vtex config:set CONFIGNAME VALUE`

Sets the current value for the given configuration

```
USAGE
  $ vtex config:set CONFIGNAME VALUE

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex config set env envValue
  vtex config set cluster clusterValue
```

_See code: [src/commands/config/set.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/config/set.ts)_

## `vtex debug`

Debug commands

```
USAGE
  $ vtex debug

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/debug/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/debug/index.ts)_

## `vtex debug:dotnet DEBUGINST`

Debug for .NET applications

```
USAGE
  $ vtex debug:dotnet DEBUGINST

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex debug dotnet debugInst
```

_See code: [src/commands/debug/dotnet.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/debug/dotnet.ts)_

## `vtex deploy [APPID]`

Deploy a release of an app

```
USAGE
  $ vtex deploy [APPID]

OPTIONS
  -h, --help  show CLI help
  -y, --yes   Answer yes to confirmation prompts

EXAMPLES
  vtex deploy
  vtex deploy vtex.service-example@0.0.1
```

_See code: [src/commands/deploy.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/deploy.ts)_

## `vtex deprecate APPID`

Deprecate an app

```
USAGE
  $ vtex deprecate APPID

OPTIONS
  -h, --help  show CLI help
  -y, --yes   Confirm all prompts

EXAMPLE
  vtex deprecate vtex.service-example@0.0.1
```

_See code: [src/commands/deprecate.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/deprecate.ts)_

## `vtex deps`

Deps commands

```
USAGE
  $ vtex deps

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/deps/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/deps/index.ts)_

## `vtex deps:diff [WORKSPACE1] [WORKSPACE2]`

Diff between workspace dependencies. If only a parameter is passed the current workspace is used in the diff and if no parameter is passed the diff is made between the current workspace and master.

```
USAGE
  $ vtex deps:diff [WORKSPACE1] [WORKSPACE2]

EXAMPLE
  vtex deps diff workspace1 workspace2
```

_See code: [src/commands/deps/diff.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/deps/diff.ts)_

## `vtex deps:list`

List your workspace dependencies

```
USAGE
  $ vtex deps:list

OPTIONS
  -k, --keys  Show only keys

ALIASES
  $ vtex deps ls

EXAMPLES
  vtex deps list
  vtex deps ls
```

_See code: [src/commands/deps/list.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/deps/list.ts)_

## `vtex deps:update [APPID]`

Update all workspace dependencies or a specific app@version

```
USAGE
  $ vtex deps:update [APPID]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLES
  vtex deps update
  vtex deps update vtex.service-example@0.0.1
```

_See code: [src/commands/deps/update.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/deps/update.ts)_

## `vtex edition`

Edition commands

```
USAGE
  $ vtex edition

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/edition/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/edition/index.ts)_

## `vtex edition:get`

Get edition of the current account

```
USAGE
  $ vtex edition:get

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex edition get
```

_See code: [src/commands/edition/get.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/edition/get.ts)_

## `vtex edition:set EDITION`

Set edition of the current account

```
USAGE
  $ vtex edition:set EDITION

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex edition set editionName
```

_See code: [src/commands/edition/set.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/edition/set.ts)_

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

## `vtex infra`

Infra commands

```
USAGE
  $ vtex infra

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/infra/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/infra/index.ts)_

## `vtex infra:install SERVICEID`

Install an infra service

```
USAGE
  $ vtex infra:install SERVICEID

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex infra install infra-service
  vtex infra install infra-service@0.0.1
```

_See code: [src/commands/infra/install.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/infra/install.ts)_

## `vtex infra:list [NAME]`

List installed infra services

```
USAGE
  $ vtex infra:list [NAME]

OPTIONS
  -a, --available      List services available to install
  -f, --filter=filter  Only list versions containing this word
  -h, --help           show CLI help

ALIASES
  $ vtex infra ls

EXAMPLES
  vtex infra list
  vtex infra ls
```

_See code: [src/commands/infra/list.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/infra/list.ts)_

## `vtex infra:update`

Update all installed infra services

```
USAGE
  $ vtex infra:update

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex infra update
```

_See code: [src/commands/infra/update.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/infra/update.ts)_

## `vtex init`

Create basic files and folders for your VTEX app

```
USAGE
  $ vtex init

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex init
```

_See code: [src/commands/init.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/init.ts)_

## `vtex install [APPID]`

Install an app (defaults to the app in the current directory)

```
USAGE
  $ vtex install [APPID]

OPTIONS
  -f, --force  Install app without checking for route conflicts
  -h, --help   show CLI help

EXAMPLES
  vtex install
  vtex install vtex.service-example@0.x
  vtex install vtex.service-example@0.0.1
```

_See code: [src/commands/install.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/install.ts)_

## `vtex link`

Start a development session for this app

```
USAGE
  $ vtex link

OPTIONS
  -c, --clean   Clean builder cache
  -h, --help    show CLI help
  -s, --setup   Do not add app dependencies to package.json and do not run Yarn
  -u, --unsafe  Allow links with Typescript errors
  --no-watch    Don't watch for file changes after initial link
```

_See code: [src/commands/link.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/link.ts)_

## `vtex list`

List your installed VTEX apps

```
USAGE
  $ vtex list

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex ls

EXAMPLES
  vtex list
  vtex ls
```

_See code: [src/commands/list.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/list.ts)_

## `vtex local`

Local commands

```
USAGE
  $ vtex local

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/local/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/local/index.ts)_

## `vtex local:account`

Show current account and copy it to clipboard

```
USAGE
  $ vtex local:account

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex local account
```

_See code: [src/commands/local/account.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/local/account.ts)_

## `vtex local:token`

Show user's auth token and copy it to clipboard

```
USAGE
  $ vtex local:token

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex local token
```

_See code: [src/commands/local/token.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/local/token.ts)_

## `vtex local:workspace`

Show current workspace and copy it to clipboard

```
USAGE
  $ vtex local:workspace

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex local workspace
```

_See code: [src/commands/local/workspace.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/local/workspace.ts)_

## `vtex login [ACCOUNT] [WORKSPACE]`

Log into a VTEX account

```
USAGE
  $ vtex login [ACCOUNT] [WORKSPACE]

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex login
  vtex login storecomponents
  vtex login storecomponents myworkspace
```

_See code: [src/commands/login.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/login.ts)_

## `vtex logout`

Logout of the current VTEX account

```
USAGE
  $ vtex logout

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex logout
```

_See code: [src/commands/logout.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/logout.ts)_

## `vtex publish`

Publish the current app or a path containing an app

```
USAGE
  $ vtex publish

OPTIONS
  -f, --force                Publish app without checking if the semver is being respected
  -h, --help                 show CLI help
  -t, --tag=tag              Apply a tag to the release
  -w, --workspace=workspace  Specify the workspace for the app registry
  -y, --yes                  Answer yes to confirmation prompts

EXAMPLE
  vtex publish
```

_See code: [src/commands/publish.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/publish.ts)_

## `vtex redirects`

Redirects commands

```
USAGE
  $ vtex redirects

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/redirects/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/redirects/index.ts)_

## `vtex redirects:delete CSVPATH`

Delete redirects in the current account and workspace

```
USAGE
  $ vtex redirects:delete CSVPATH

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex redirects delete csvPath
```

_See code: [src/commands/redirects/delete.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/redirects/delete.ts)_

## `vtex redirects:export CSVPATH`

Export all redirects in the current account and workspace

```
USAGE
  $ vtex redirects:export CSVPATH

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex redirects export csvPath
```

_See code: [src/commands/redirects/export.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/redirects/export.ts)_

## `vtex redirects:import CSVPATH`

Import redirects for the current account and workspace

```
USAGE
  $ vtex redirects:import CSVPATH

OPTIONS
  -h, --help   show CLI help
  -r, --reset  Remove all previous redirects

EXAMPLE
  vtex redirects import csvPath
```

_See code: [src/commands/redirects/import.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/redirects/import.ts)_

## `vtex release [RELEASETYPE] [TAGNAME]`

Bump app version, commit and push to remote. Only for git users. The first option can also be a specific valid semver version

```
USAGE
  $ vtex release [RELEASETYPE] [TAGNAME]

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex release
  vtex release patch
  vtex release patch beta
  vtex release minor stable
  vtex release pre
```

_See code: [src/commands/release.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/release.ts)_

## `vtex settings`

Settings commands

```
USAGE
  $ vtex settings

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/settings/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/settings/index.ts)_

## `vtex settings:get APPNAME [OPTIONS]`

Get app settings

```
USAGE
  $ vtex settings:get APPNAME [OPTIONS]

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex settings

EXAMPLE
  vtex settings get vtex.service-example
```

_See code: [src/commands/settings/get.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/settings/get.ts)_

## `vtex settings:set APPNAME FIELD VALUE`

Set app settings

```
USAGE
  $ vtex settings:set APPNAME FIELD VALUE

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex settings set vtex.service-example fieldName fieldValue
```

_See code: [src/commands/settings/set.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/settings/set.ts)_

## `vtex settings:unset APPNAME FIELD`

Unset app settings

```
USAGE
  $ vtex settings:unset APPNAME FIELD

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex settings unset vtex.service-example fieldName
```

_See code: [src/commands/settings/unset.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/settings/unset.ts)_

## `vtex setup`

Download react app typings, graphql app typings, lint config and tsconfig

```
USAGE
  $ vtex setup

OPTIONS
  -h, --help           show CLI help
  -i, --ignore-linked  Add only types from apps published
```

_See code: [src/commands/setup.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/setup.ts)_

## `vtex support ACCOUNT`

Login as support into another VTEX account

```
USAGE
  $ vtex support ACCOUNT

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex support storecomponents
  vtex support
```

_See code: [src/commands/support.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/support.ts)_

## `vtex switch ACCOUNT [WORKSPACE]`

Switch to another VTEX account

```
USAGE
  $ vtex switch ACCOUNT [WORKSPACE]

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex switch storecomponents
  vtex switch storecomponents myworkspace
```

_See code: [src/commands/switch.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/switch.ts)_

## `vtex test`

Test commands

```
USAGE
  $ vtex test

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/test/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/test/index.ts)_

## `vtex test:ab:finish`

Stop all AB testing in current account

```
USAGE
  $ vtex test:ab:finish

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/test/ab/finish.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/test/ab/finish.ts)_

## `vtex test:ab:start`

Start AB testing with current workspace

```
USAGE
  $ vtex test:ab:start

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/test/ab/start.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/test/ab/start.ts)_

## `vtex test:ab:status`

Display currently running AB tests results

```
USAGE
  $ vtex test:ab:status

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/test/ab/status.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/test/ab/status.ts)_

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
```

_See code: [src/commands/test/e2e.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/test/e2e.ts)_

## `vtex test:unit`

Run your VTEX app unit tests

```
USAGE
  $ vtex test:unit

OPTIONS
  -h, --help    show CLI help
  -u, --unsafe  Allow tests with Typescript errors

ALIASES
  $ vtex test
```

_See code: [src/commands/test/unit.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/test/unit.ts)_

## `vtex undeprecate APPID`

Undeprecate app

```
USAGE
  $ vtex undeprecate APPID

OPTIONS
  -h, --help  show CLI help
  -y, --yes   Confirm all prompts

EXAMPLE
  vtex undeprecate vtex.service-example@0.0.1
```

_See code: [src/commands/undeprecate.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/undeprecate.ts)_

## `vtex uninstall [APPNAME]`

Uninstall an app (defaults to the app in the current directory)

```
USAGE
  $ vtex uninstall [APPNAME]

OPTIONS
  -h, --help  show CLI help
  -y, --yes   Auto confirm prompts

EXAMPLES
  vtex uninstall
  vtex uninstall vtex.service-example
  vtex uninstall vtex.service-example@0.x
```

_See code: [src/commands/uninstall.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/uninstall.ts)_

## `vtex unlink [APPID]`

Unlink an app on the current directory or a specified one

```
USAGE
  $ vtex unlink [APPID]

OPTIONS
  -a, --all   Unlink all apps
  -h, --help  show CLI help

EXAMPLES
  vtex unlink
  vtex unlink vtex.service-example@0.x
```

_See code: [src/commands/unlink.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/unlink.ts)_

## `vtex update`

Update all installed apps to the latest (minor or patch) version

```
USAGE
  $ vtex update

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex update
```

_See code: [src/commands/update.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/update.ts)_

## `vtex url`

Prints base URL for current account, workspace and environment

```
USAGE
  $ vtex url

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex url
```

_See code: [src/commands/url.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/url.ts)_

## `vtex whoami`

See your credentials current status

```
USAGE
  $ vtex whoami

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex whoami
```

_See code: [src/commands/whoami.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/whoami.ts)_

## `vtex workspace`

Workspace commands

```
USAGE
  $ vtex workspace

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/workspace/index.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/workspace/index.ts)_

## `vtex workspace:create [WORKSPACENAME]`

Create a new workspace with this name

```
USAGE
  $ vtex workspace:create [WORKSPACENAME]

OPTIONS
  -h, --help        show CLI help
  -p, --production  Create a production workspace

EXAMPLE
  vtex workspace create workspaceName
```

_See code: [src/commands/workspace/create.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/workspace/create.ts)_

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
  vtex workspace delete workspaceName
  vtex workspace delete workspaceName1 workspaceName2
```

_See code: [src/commands/workspace/delete.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/workspace/delete.ts)_

## `vtex workspace:info`

Display information about the current workspace

```
USAGE
  $ vtex workspace:info

OPTIONS
  -h, --help  show CLI help

ALIASES
  $ vtex workspace

EXAMPLES
  vtex workspace info
  vtex info
```

_See code: [src/commands/workspace/info.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/workspace/info.ts)_

## `vtex workspace:list`

List workspaces on this account

```
USAGE
  $ vtex workspace:list

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex workspace list
  vtex workspace ls
```

_See code: [src/commands/workspace/list.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/workspace/list.ts)_

## `vtex workspace:promote`

Promote this workspace to master

```
USAGE
  $ vtex workspace:promote

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  vtex workspace promote
  vtex promote
```

_See code: [src/commands/workspace/promote.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/workspace/promote.ts)_

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
  vtex workspace reset
  vtex workspace reset workspaceName
```

_See code: [src/commands/workspace/reset.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/workspace/reset.ts)_

## `vtex workspace:status [WORKSPACENAME]`

Display information about a workspace

```
USAGE
  $ vtex workspace:status [WORKSPACENAME]

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  vtex workspace status
```

_See code: [src/commands/workspace/status.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/workspace/status.ts)_

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
  vtex workspace use workspaceName
  vtex use worspaceName
```

_See code: [src/commands/workspace/use.ts](https://github.com/vtex/toolbelt/blob/v3.0.0-alpha.1/src/commands/workspace/use.ts)_
<!-- commandsstop -->
