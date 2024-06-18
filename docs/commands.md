# Commands

* [`vtex add APPID [ITHAPPID]`](#vtex-add-appid-ithappid)
* [`vtex browse [PATH]`](#vtex-browse-path)
* [`vtex config get CONFIGNAME`](#vtex-configget-configname)
* [`vtex config reset CONFIGNAME`](#vtex-configreset-configname)
* [`vtex config set CONFIGNAME VALUE`](#vtex-configset-configname-value)
* [`vtex deploy [APPID]`](#vtex-deploy-appid)
* [`vtex deprecate [APPID] [ITHAPPID]`](#vtex-deprecate-appid-ithappid)
* [`vtex deps diff [WORKSPACE1] [WORKSPACE2]`](#vtex-depsdiff-workspace1-workspace2)
* [`vtex deps list`](#vtex-depslist)
* [`vtex deps update [APPID] [ITHAPPID]`](#vtex-depsupdate-appid-ithappid)
* [`vtex edition get`](#vtex-editionget)
* [`vtex edition set EDITION`](#vtex-editionset-edition)
* [`vtex help [COMMAND]`](#vtex-help-command)
* [`vtex infra install SERVICEID`](#vtex-infrainstall-serviceid)
* [`vtex infra list [NAME]`](#vtex-infralist-name)
* [`vtex infra update`](#vtex-infraupdate)
* [`vtex init`](#vtex-init)
* [`vtex install [APPID] [ITHAPPID]`](#vtex-install-appid-ithappid)
* [`vtex lighthouse audit URL`](#vtex-lighthouseaudit-url)
* [`vtex lighthouse show`](#vtex-lighthouseshow)
* [`vtex link`](#vtex-link)
* [`vtex list`](#vtex-list)
* [`vtex local account`](#vtex-localaccount)
* [`vtex local token`](#vtex-localtoken)
* [`vtex local welcome`](#vtex-localwelcome)
* [`vtex local workspace`](#vtex-localworkspace)
* [`vtex login [ACCOUNT]`](#vtex-login-account)
* [`vtex logout`](#vtex-logout)
* [`vtex logs [APP]`](#vtex-logs-app)
* [`vtex publish`](#vtex-publish)
* [`vtex redirects delete CSVPATH`](#vtex-redirectsdelete-csvpath)
* [`vtex redirects export CSVPATH`](#vtex-redirectsexport-csvpath)
* [`vtex redirects import CSVPATH`](#vtex-redirectsimport-csvpath)
* [`vtex release [RELEASETYPE] [TAGNAME]`](#vtex-release-releasetype-tagname)
* [`vtex settings get APPNAME [FIELD]`](#vtex-settingsget-appname-field)
* [`vtex settings set APPNAME FIELD VALUE`](#vtex-settingsset-appname-field-value)
* [`vtex settings unset APPNAME FIELD`](#vtex-settingsunset-appname-field)
* [`vtex setup`](#vtex-setup)
* [`vtex support ACCOUNT`](#vtex-support-account)
* [`vtex switch ACCOUNT`](#vtex-switch-account)
* [`vtex test e2e`](#vtex-teste2e)
* [`vtex test unit`](#vtex-testunit)
* [`vtex undeprecate [APPID] [ITHAPPID]`](#vtex-undeprecate-appid-ithappid)
* [`vtex uninstall [APPNAME] [ITHAPPNAME]`](#vtex-uninstall-appname-ithappname)
* [`vtex unlink [APPID] [ITHAPPID]`](#vtex-unlink-appid-ithappid)
* [`vtex update`](#vtex-update)
* [`vtex url`](#vtex-url)
* [`vtex whoami`](#vtex-whoami)
* [`vtex workspace abtest finish`](#vtex-workspaceabtestfinish)
* [`vtex workspace abtest start`](#vtex-workspaceabteststart)
* [`vtex workspace abtest status`](#vtex-workspaceabteststatus)
* [`vtex workspace create [WORKSPACENAME]`](#vtex-workspacecreate-workspacename)
* [`vtex workspace delete WORKSPACE1 [ITHWORKSPACE]`](#vtex-workspacedelete-workspace1-ithworkspace)
* [`vtex workspace info`](#vtex-workspaceinfo)
* [`vtex workspace list`](#vtex-workspacelist)
* [`vtex workspace promote`](#vtex-workspacepromote)
* [`vtex workspace reset [WORKSPACENAME]`](#vtex-workspacereset-workspacename)
* [`vtex workspace status [WORKSPACENAME]`](#vtex-workspacestatus-workspacename)
* [`vtex workspace use WORKSPACE`](#vtex-workspaceuse-workspace)

## `vtex add APPID [ITHAPPID]`

Add app(s) to the manifest dependencies

```
USAGE
  $ vtex add APPID [ITHAPPID]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex add vtex.service-example@0.x
```

_See code: [build/commands/add.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/add.ts)_

## `vtex browse [PATH]`

Open endpoint in browser window

```
USAGE
  $ vtex browse [PATH]

OPTIONS
  -h, --help     show CLI help
  -q, --qr       Outputs a QR Code on the terminal
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex browse
  vtex browse admin
```

_See code: [build/commands/browse.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/browse.ts)_

## `vtex config get CONFIGNAME`

Gets the current value for the requested configuration

```
USAGE
  $ vtex config get CONFIGNAME

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex config get env
  vtex config get cluster
```

_See code:  [build/commands/config/get.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/config/get.ts)_

## `vtex config reset CONFIGNAME`

Reset the requested configuration to the default value

```
USAGE
  $ vtex config reset CONFIGNAME

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex config reset env
  vtex config reset cluster
```

_See code:  [build/commands/config/reset.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/config/reset.ts)_

## `vtex config set CONFIGNAME VALUE`

Sets the current value for the given configuration

```
USAGE
  $ vtex config set CONFIGNAME VALUE

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex config set env envValue
  vtex config set cluster clusterValue
```

_See code:  [build/commands/config/set.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/config/set.ts)_

## `vtex deploy [APPID]`

Deploy a release of an app

```
USAGE
  $ vtex deploy [APPID]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  -y, --yes      Answer yes to confirmation prompts
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex deploy
  vtex deploy vtex.service-example@0.0.1
```

_See code: [build/commands/deploy.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/deploy.ts)_

## `vtex deprecate [APPID] [ITHAPPID]`

Deprecate an app

```
USAGE
  $ vtex deprecate [APPID] [ITHAPPID]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  -y, --yes      Confirm all prompts
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex deprecate
  vtex deprecate vtex.service-example@0.0.1
```

_See code: [build/commands/deprecate.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/deprecate.ts)_

## `vtex deps diff [WORKSPACE1] [WORKSPACE2]`

Diff between workspace dependencies. If only one parameter is passed the current workspace is used in the diff and if no parameter is passed the diff is made between the current workspace and master

```
USAGE
  $ vtex deps diff [WORKSPACE1] [WORKSPACE2]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex deps diff workspace1 workspace2
```

_See code:  [@vtex/cli-plugin-deps](https://github.com/vtex/cli-plugin-deps/blob/v0.0.1/build/commands/deps/diff.ts)_

## `vtex deps list`

List your workspace dependencies

```
USAGE
  $ vtex deps list

OPTIONS
  -h, --help     show CLI help
  -k, --keys     Show only keys
  -n, --npm      Include deps from npm registry
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex deps ls

EXAMPLES
  vtex deps list
  vtex deps ls
```

_See code:  [@vtex/cli-plugin-deps](https://github.com/vtex/cli-plugin-deps/blob/v0.0.1/build/commands/deps/list.ts)_

## `vtex deps update [APPID] [ITHAPPID]`

Update all workspace dependencies or a specific app@version

```
USAGE
  $ vtex deps update [APPID] [ITHAPPID]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex deps update
  vtex deps update vtex.service-example@0.0.1
```

_See code:  [@vtex/cli-plugin-deps](https://github.com/vtex/cli-plugin-deps/blob/v0.0.1/build/commands/deps/update.ts)_

## `vtex edition get`

Get edition of the current account

```
USAGE
  $ vtex edition get

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex edition get
```

_See code:  [@vtex/cli-plugin-edition](https://github.com/vtex/cli-plugin-edition/blob/v0.0.1/build/commands/edition/get.ts)_

## `vtex edition set EDITION`

Set edition of the current account

```
USAGE
  $ vtex edition set EDITION

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex edition set editionName
```

_See code:  [@vtex/cli-plugin-edition](https://github.com/vtex/cli-plugin-edition/blob/v0.0.1/build/commands/edition/set.ts)_

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

_See code:  [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `vtex infra install SERVICEID`

Install an infra service

```
USAGE
  $ vtex infra install SERVICEID

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex infra install infra-service
  vtex infra install infra-service@0.0.1
```

_See code:  [build/commands/infra/install.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/infra/install.ts)_

## `vtex infra list [NAME]`

List installed infra services

```
USAGE
  $ vtex infra list [NAME]

OPTIONS
  -a, --available      List services available to install
  -f, --filter=filter  Only list versions containing this word
  -h, --help           show CLI help
  -v, --verbose        Show debug level logs
  --trace              Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex infra ls

EXAMPLES
  vtex infra list
  vtex infra ls
```

_See code:  [build/commands/infra/list.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/infra/list.ts)_

## `vtex infra update`

Update all installed infra services

```
USAGE
  $ vtex infra update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex infra update
```

_See code:  [build/commands/infra/update.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/infra/update.ts)_

## `vtex init`

Create basic files and folders for your VTEX app

```
USAGE
  $ vtex init

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex init
```

_See code:  [build/commands/init.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/init.ts)_

## `vtex install [APPID] [ITHAPPID]`

Install an app (defaults to the app in the current directory)

```
USAGE
  $ vtex install [APPID] [ITHAPPID]

OPTIONS
  -f, --force    Install app without checking for route conflicts
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex install
  vtex install vtex.service-example@0.x
  vtex install vtex.service-example@0.0.1
```

_See code:  [build/commands/install.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/install.ts)_

## `vtex lighthouse audit URL`

Run lighthouse audit over a specific url

```
USAGE
  $ vtex lighthouse audit URL

OPTIONS
  -h, --help     show CLI help
  -j, --json     Return the report as json on stdout
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex lh audit

EXAMPLES
  vtex lighthouse audit my.url.com
  vtex lh audit my.url.com
```

_See code:  [@vtex/cli-plugin-lighthouse](https://github.com/vtex/cli-plugin-lighthouse/blob/v0.0.3/build/commands/lighthouse/audit.ts)_

## `vtex lighthouse show`

Show previous saved audit reports, filtering by app and/or url

```
USAGE
  $ vtex lighthouse show

OPTIONS
  -a, --app=app  App name to be filtered
  -h, --help     show CLI help
  -u, --url=url  Url to be filtered
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex lh show

EXAMPLES
  vtex lighthouse show --app=vtex.awesome-app
  vtex lighthouse show -u https://awesome.store.com
  vtex lighthouse show -a vtex.awesome-app --url=https://awesome.store.com
  vtex lh show --app=vtex.awesome-app
  vtex lh show -u https://awesome.store.com
  vtex lh show -a vtex.awesome-app --url=https://awesome.store.com
```

_See code:  [@vtex/cli-plugin-lighthouse](https://github.com/vtex/cli-plugin-lighthouse/blob/v0.0.3/build/commands/lighthouse/show.ts)_

## `vtex link`

Start a development session for this app

```
USAGE
  $ vtex link

OPTIONS
  -a, --account=account      Account to login before linking the app. This flag has to be paired with the '--workspace'
                             flag.

  -c, --clean                Clean builder cache

  -h, --help                 show CLI help

  -s, --setup                Setup typings before linking [see vtex setup --help]

  -u, --unsafe               Allow links with Typescript errors

  -v, --verbose              Show debug level logs

  -w, --workspace=workspace  Workspace to switch to before linking the app. Can be paired with the '--account' flag to
                             change account and switch to the given workspace.

  --no-watch                 Don't watch for file changes after initial link

  --trace                    Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex link -a youraccount -w yourworkspace
```

_See code:  [build/commands/link.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/link.ts)_

## `vtex list`

List your installed VTEX apps

```
USAGE
  $ vtex list

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex ls

EXAMPLES
  vtex list
  vtex ls
```

_See code:  [build/commands/list.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/list.ts)_

## `vtex local account`

Show current account and copy it to clipboard

```
USAGE
  $ vtex local account

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex local account
```

_See code:  [build/commands/local/account.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/local/account.ts)_

## `vtex local token`

Show user's auth token and copy it to clipboard

```
USAGE
  $ vtex local token

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex local token
```

_See code:  [build/commands/local/token.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/local/token.ts)_

## `vtex local welcome`

Gives some commonly sought-after info after you log in

```
USAGE
  $ vtex local welcome

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex welcome

EXAMPLES
  vtex welcome
  vtex local welcome
```

_See code:  [build/commands/local/welcome.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/local/welcome.ts)_

## `vtex local workspace`

Show current workspace and copy it to clipboard

```
USAGE
  $ vtex local workspace

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex local workspace
```

_See code:  [build/commands/local/workspace.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/local/workspace.ts)_

## `vtex login [ACCOUNT]`

Log into a VTEX account

```
USAGE
  $ vtex login [ACCOUNT]

OPTIONS
  -h, --help                 show CLI help
  -v, --verbose              Show debug level logs
  -w, --workspace=workspace  Workspace to login into
  --trace                    Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex login
  vtex login storecomponents
```

_See code:  [build/commands/login.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/login.ts)_

## `vtex logout`

Logout of the current VTEX account

```
USAGE
  $ vtex logout

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex logout
```

_See code:  [build/commands/logout.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/logout.ts)_

## `vtex logs [APP]`

Show apps production logs

```
USAGE
  $ vtex logs [APP]

OPTIONS
  -a, --all      Show all logs from this account's apps
  -h, --help     show CLI help
  -p, --past     Show logs already seen from this account's apps
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex logs
  vtex logs appName
  vtex logs --all
  vtex logs appName --past
```

_See code:  [build/commands/logs.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/logs.ts)_

## `vtex publish`

Publish the current app or a path containing an app

```
USAGE
  $ vtex publish

OPTIONS
  -f, --force                Publish app without checking if the semver is being respected
  -h, --help                 show CLI help
  -t, --tag=tag              Apply a tag to the release
  -v, --verbose              Show debug level logs
  -w, --workspace=workspace  Specify the workspace for the app registry
  -y, --yes                  Answer yes to confirmation prompts
  --trace                    Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex publish
```

_See code:  [build/commands/publish.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/publish.ts)_

## `vtex redirects delete CSVPATH`

Delete redirects in the current account and workspace

```
USAGE
  $ vtex redirects delete CSVPATH

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex redirects delete csvPath
```

_See code:  [@vtex/cli-plugin-redirects](https://github.com/vtex/cli-plugin-redirects/blob/v0.0.2/build/commands/redirects/delete.ts)_

## `vtex redirects export CSVPATH`

Export all redirects in the current account and workspace

```
USAGE
  $ vtex redirects export CSVPATH

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex redirects export csvPath
```

_See code:  [@vtex/cli-plugin-redirects](https://github.com/vtex/cli-plugin-redirects/blob/v0.0.2/build/commands/redirects/export.ts)_

## `vtex redirects import CSVPATH`

Import redirects for the current account and workspace

```
USAGE
  $ vtex redirects import CSVPATH

OPTIONS
  -h, --help     show CLI help
  -r, --reset    Remove all previous redirects
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex redirects import csvPath
```

_See code:  [@vtex/cli-plugin-redirects](https://github.com/vtex/cli-plugin-redirects/blob/v0.0.2/build/commands/redirects/import.ts)_

## `vtex release [RELEASETYPE] [TAGNAME]`

Bump app version, commit and push to remote. Only for git users. The first option can also be a specific valid semver version

```
USAGE
  $ vtex release [RELEASETYPE] [TAGNAME]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced
  --display-name Add the project name to the tag and release commit

EXAMPLES
  vtex release
  vtex release patch
  vtex release patch beta
  vtex release minor stable
  vtex release pre
```

_See code:  [build/commands/release.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/release.ts)_

## `vtex settings get APPNAME [FIELD]`

Get app settings

```
USAGE
  $ vtex settings get APPNAME [FIELD]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex settings

EXAMPLE
  vtex settings get vtex.service-example
```

_See code:  [build/commands/settings/get.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/settings/get.ts)_

## `vtex settings set APPNAME FIELD VALUE`

Set app settings

```
USAGE
  $ vtex settings set APPNAME FIELD VALUE

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex settings set vtex.service-example fieldName fieldValue
```

_See code:  [build/commands/settings/set.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/settings/set.ts)_

## `vtex settings unset APPNAME FIELD`

Unset app settings

```
USAGE
  $ vtex settings unset APPNAME FIELD

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex settings unset vtex.service-example fieldName
```

_See code:  [build/commands/settings/unset.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/settings/unset.ts)_

## `vtex setup`

Setup development enviroment

```
USAGE
  $ vtex setup

OPTIONS
  -h, --help           show CLI help
  -i, --ignore-linked  Add only types from apps published
  -v, --verbose        Show debug level logs
  --all                Select all existing setup flags

  --tooling            Setup tools for applicable builders
                       Node and React  Prettier, Husky and ESLint

  --trace              Ensure all requests to VTEX IO are traced

  --tsconfig           Setup React and Node's TSconfig, if applicable

  --typings            Setup GraphQL and React typings
```

_See code:  [build/commands/setup.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/setup.ts)_

## `vtex support ACCOUNT`

Login as support into another VTEX account

```
USAGE
  $ vtex support ACCOUNT

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex support storecomponents
```

_See code:  [build/commands/support.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/support.ts)_

## `vtex switch ACCOUNT`

Switch to another VTEX account

```
USAGE
  $ vtex switch ACCOUNT

OPTIONS
  -h, --help                 show CLI help
  -v, --verbose              Show debug level logs
  -w, --workspace=workspace  Specify login workspace
  --trace                    Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex switch storecomponents
```

_See code:  [build/commands/switch.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/switch.ts)_

## `vtex test e2e`

Run your VTEX app's integration tests

```
USAGE
  $ vtex test e2e

OPTIONS
  -h, --help           show CLI help
  -r, --report=report  Check the results and state of a previously started test given its ID

  -t, --token          [Not recommended] Send your personal authorization token to your test session so it's available
                       while running the tests. It can be dangerous because exposes the token via 'authToken'
                       environment variable

  -v, --verbose        Show debug level logs

  -w, --workspace      Test workspace's apps

  --trace              Ensure all requests to VTEX IO are traced
```

_See code:  [@vtex/cli-plugin-test](https://github.com/vtex/cli-plugin-test/blob/v0.0.5/build/commands/test/e2e.ts)_

## `vtex test unit`

Run your VTEX app unit tests

```
USAGE
  $ vtex test unit

OPTIONS
  -h, --help     show CLI help
  -u, --unsafe   Allow tests with Typescript errors
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced
```

_See code:  [@vtex/cli-plugin-test](https://github.com/vtex/cli-plugin-test/blob/v0.0.5/build/commands/test/unit.ts)_

## `vtex undeprecate [APPID] [ITHAPPID]`

Undeprecate app

```
USAGE
  $ vtex undeprecate [APPID] [ITHAPPID]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  -y, --yes      Confirm all prompts
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex undeprecate vtex.service-example@0.0.1
```

_See code:  [build/commands/undeprecate.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/undeprecate.ts)_

## `vtex uninstall [APPNAME] [ITHAPPNAME]`

Uninstall an app (defaults to the app in the current directory)

```
USAGE
  $ vtex uninstall [APPNAME] [ITHAPPNAME]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  -y, --yes      Auto confirm prompts
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex uninstall
  vtex uninstall vtex.service-example
  vtex uninstall vtex.service-example@0.x
```

_See code:  [build/commands/uninstall.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/uninstall.ts)_

## `vtex unlink [APPID] [ITHAPPID]`

Unlink an app on the current directory or a specified one

```
USAGE
  $ vtex unlink [APPID] [ITHAPPID]

OPTIONS
  -a, --all      Unlink all apps
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex unlink
  vtex unlink vtex.service-example@0.x
```

_See code:  [build/commands/unlink.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/unlink.ts)_

## `vtex update`

Update all installed apps to the latest (minor or patch) version

```
USAGE
  $ vtex update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex update
```

_See code:  [build/commands/update.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/update.ts)_

## `vtex url`

Prints base URL for current account, workspace and environment

```
USAGE
  $ vtex url

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex url
```

_See code:  [build/commands/url.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/url.ts)_

## `vtex whoami`

See your credentials current status

```
USAGE
  $ vtex whoami

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex whoami
```

_See code:  [build/commands/whoami.ts](https://github.com/vtex/toolbelt/blob/v2.110.1/build/commands/whoami.ts)_

## `vtex workspace abtest finish`

Stop all AB testing in current account

```
USAGE
  $ vtex workspace abtest finish

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced
```

_See code:  [@vtex/cli-plugin-abtest](https://github.com/vtex/cli-plugin-abtest/blob/v0.0.5/build/commands/workspace/abtest/finish.ts)_

## `vtex workspace abtest start`

Start AB testing with current workspace

```
USAGE
  $ vtex workspace abtest start

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced
```

_See code:  [@vtex/cli-plugin-abtest](https://github.com/vtex/cli-plugin-abtest/blob/v0.0.5/build/commands/workspace/abtest/start.ts)_

## `vtex workspace abtest status`

Display currently running AB tests results

```
USAGE
  $ vtex workspace abtest status

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced
```

_See code:  [@vtex/cli-plugin-abtest](https://github.com/vtex/cli-plugin-abtest/blob/v0.0.5/build/commands/workspace/abtest/status.ts)_

## `vtex workspace create [WORKSPACENAME]`

Create a new workspace

```
USAGE
  $ vtex workspace create [WORKSPACENAME]

OPTIONS
  -h, --help        show CLI help
  -p, --production  Create a production workspace
  -v, --verbose     Show debug level logs
  --trace           Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex workspace create workspaceName
```

_See code:  [@vtex/cli-plugin-workspace](https://github.com/vtex/cli-plugin-workspace/blob/v0.0.2/build/commands/workspace/create.ts)_

## `vtex workspace delete WORKSPACE1 [ITHWORKSPACE]`

Delete one or many workspaces

```
USAGE
  $ vtex workspace delete WORKSPACE1 [ITHWORKSPACE]

OPTIONS
  -f, --force    Ignore if you're currently using the workspace
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  -y, --yes      Answer yes to confirmation prompts
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex workspace delete workspaceName
  vtex workspace delete workspaceName1 workspaceName2
```

_See code:  [@vtex/cli-plugin-workspace](https://github.com/vtex/cli-plugin-workspace/blob/v0.0.2/build/commands/workspace/delete.ts)_

## `vtex workspace info`

Display information about the current workspace

```
USAGE
  $ vtex workspace info

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex workspace info
```

_See code:  [@vtex/cli-plugin-workspace](https://github.com/vtex/cli-plugin-workspace/blob/v0.0.2/build/commands/workspace/info.ts)_

## `vtex workspace list`

List workspaces on this account

```
USAGE
  $ vtex workspace list

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex workspace ls

EXAMPLES
  vtex workspace list
  vtex workspace ls
```

_See code:  [@vtex/cli-plugin-workspace](https://github.com/vtex/cli-plugin-workspace/blob/v0.0.2/build/commands/workspace/list.ts)_

## `vtex workspace promote`

Promote this workspace to master

```
USAGE
  $ vtex workspace promote

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex promote

EXAMPLES
  vtex workspace promote
  vtex promote
```

_See code:  [@vtex/cli-plugin-workspace](https://github.com/vtex/cli-plugin-workspace/blob/v0.0.2/build/commands/workspace/promote.ts)_

## `vtex workspace reset [WORKSPACENAME]`

Delete and recreate a workspace

```
USAGE
  $ vtex workspace reset [WORKSPACENAME]

OPTIONS
  -h, --help        show CLI help
  -p, --production  Re-create the workspace as a production one
  -v, --verbose     Show debug level logs
  -y, --yes         Answer yes to confirmation prompts
  --trace           Ensure all requests to VTEX IO are traced

EXAMPLES
  vtex workspace reset
  vtex workspace reset workspaceName
```

_See code:  [@vtex/cli-plugin-workspace](https://github.com/vtex/cli-plugin-workspace/blob/v0.0.2/build/commands/workspace/reset.ts)_

## `vtex workspace status [WORKSPACENAME]`

Display information about a workspace

```
USAGE
  $ vtex workspace status [WORKSPACENAME]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  Show debug level logs
  --trace        Ensure all requests to VTEX IO are traced

EXAMPLE
  vtex workspace status
```

_See code:  [@vtex/cli-plugin-workspace](https://github.com/vtex/cli-plugin-workspace/blob/v0.0.2/build/commands/workspace/status.ts)_

## `vtex workspace use WORKSPACE`

Use a workspace to perform operations

```
USAGE
  $ vtex workspace use WORKSPACE

OPTIONS
  -h, --help        show CLI help
  -p, --production  Create the workspace as production if it does not exist or is reset
  -r, --reset       Resets workspace before using it
  -v, --verbose     Show debug level logs
  --trace           Ensure all requests to VTEX IO are traced

ALIASES
  $ vtex use

EXAMPLES
  vtex workspace use workspaceName
  vtex use workspaceName
```

_See code:  [@vtex/cli-plugin-workspace](https://github.com/vtex/cli-plugin-workspace/blob/v0.0.2/build/commands/workspace/use.ts)_
