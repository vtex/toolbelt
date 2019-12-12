# VTEX Toolbelt

[![Build Status](https://travis-ci.org/vtex/toolbelt.svg?branch=master)](https://travis-ci.org/vtex/toolbelt) [![npm version](https://img.shields.io/npm/v/vtex.svg?style=flat)](https://www.npmjs.com/package/vtex) [![Greenkeeper badge](https://badges.greenkeeper.io/vtex/toolbelt.svg)](https://greenkeeper.io/)

All you need to start using the VTEX platform.

### What is this?

VTEX Toolbelt is a command-line program that gives you access to all of the features in the VTEX platform.

With it you can:

- List, install and uninstall available apps in your account.
- List, create and remove workspaces.
- Promote a workspace to `master`, making it public in your account URL.
- Develop new apps in link mode, using automatic synchronization.
- Publish apps to the VTEX App Store.

# Getting started

The VTEX Toolbelt can be installed via [npm](https://www.npmjs.com/).
If you don't have it installed, you can get it bundled with [node](https://nodejs.org/):
 - [Linux](https://nodejs.org/en/download/package-manager/)
 - [Mac and Windows](https://nodejs.org/en/download/)

## Installing the VTEX Toolbelt

It's recommended that you install it globally using `yarn`:

```sh
yarn global add vtex
```

Or, using `npm`:

```sh
npm install -g vtex
```

Now you can use the `vtex` command:

```
$ vtex
  Welcome to VTEX I/O
  Login with vtex login <account>

  Usage: vtex <command> [options]

  Commands:

    add <app>               Add app(s) to the manifest dependencies
    deprecate [app]         Deprecate app(s)
    init                    Create basic files and folders for your VTEX app
    install [app]           Install an app (defaults to the app in the current directory)
    link                    Start a development session for this app
    setup                   Setup your development environment (configure tsconfig and tslint, run yarn)
    list                    List your installed VTEX apps
    login                   Log into a VTEX account
    logout                  Logout of the current VTEX account
    promote                 Promote this workspace to master
    publish [path]          Publish the current app or a path containing an app
    switch <account>        Switch to another VTEX account
    test                    Run your VTEX app unit tests
    uninstall [app]         Uninstall an app (defaults to the app in the current directory)
    unlink [app]            Unlink an app on the current directory or a specified one
    update                  Update all installed apps to the latest version
    use <name>              Use a workspace to perform operations
    whoami                  See your credentials current status

    browse [endpoint]       Browse an endpoint of the store under development

    config get <name>                 Gets the current value for the requested configuration
    config set <name> <value>         Sets the current value for the given configuration

    deps list                              List your workspace dependencies
    deps update [app]                      Update all workspace dependencies or a specific app@version
    deps diff [workspace1] [workspace2]    Show dependencies difference between two workspaces

    infra install <name>     Install a service
    infra list [name]        List installed services
    infra update             Update all installed services

    local manifest    Generate manifest from package.json
    local package     Generate package.json from manifest
    local account     Show current account and copy it to clipboard
    local workspace   Show current workspace and copy it to clipboard
    local token       Show user's auth token and copy it to clipboard

    port react       Convert your app from React 0.x to React 2.x

    release [releaseType/Version] [tagName]          Bump app version, commit and push to remote (git only)

    settings <app> [fields]                     Get app settings
    settings set <app> <fields> <value>         Set a value
    settings unset <app> <fields>               Unset a value

    redirects import <csvPath>      Import redirects for the current account and workspace
    redirects export <csvPath>      Export all redirects in the current account and workspace
    redirects delete <csvPath>      Delete redirects in the current account and workspace

    url                               Prints base URL for current account, workspace and account

    workspace                         Alias for vtex workspace info
    workspace create <name>           Create a new workspace with this name
    workspace delete <name>           Delete a single or various workspaces
    workspace info                    Display information about the current workspace
    workspace list                    List workspaces on this account
    workspace promote                 Promote this workspace to master
    workspace reset [name]            Delete and create a workspace
    workspace use <name>              Use a workspace to perform operations

  Options:

    -h, --help  show help information
```

## Login

Start by using `vtex login` to receive your credentials and be able to access other features.
Simply type this command and follow the instructions.

## Using link

On an app directory, run `vtex link` and click on or copy the provided URL into your browser.

VTEX Toolbelt will now monitor your files for changes and sync them automatically.

## Customizing your prompt

You can configure your **terminal prompt** to display relevant information about your current context, like  which **account** you're logged into and which **workspace** you are currently using.

Just like knowing which `git` branch you're currently in, having this info in your prompt you help you avoid mistakes and be faster when using VTEX IO.

### `bash` users

If you are a _bash_ user you can customize your command prompt by running the following command:

```sh
echo "source $(npm root -g)/vtex/plugins/bash/vtex.bash" >> ~/.bashrc
echo "source $(npm root -g)/vtex/plugins/bash/prompt.bash" >> ~/.bashrc
```

For fine grained control, use only the first script and add `__vtex_ps1` manually to your prompt.

### `fish` users

If you want a pretty, ready-made Git + VTEX prompt you can copy `plugins/fish/fish_prompt.fish` to the  `~/.config/fish/functions` folder. To see the changes, simply restart your shell by typing `fish`.

```sh
cp (npm root -g)/vtex/plugins/fish/fish_prompt.fish ~/.config/fish/functions/
fish
```

PS: If you used `yarn` to install, you should replace `(npm root -g)` with `(yarn global dir)`.

---

# Frequently Asked Questions

## How do I login?

You can use `vtex login` to login with your VTEX ID credentials or `vtex logout` if you're already logged in and want to change credentials.

When logging in, you will be asked for **3** things:

- The `account` name of the store you wish to work on
- Your VTEX ID `e-mail`
- Your VTEX ID `password`

If you wish to work on another `account`, logout and login again with that `account`.

Note that `link` and `publish` implicitly checks if you're logged, and if you're not, it asks your credentials before proceeding.


## How do I develop an app locally?

To develop an app locally, open the directory where your VTEX app is and then type:

```sh
vtex link
```

Toolbelt will upload all your app files to the developer environment, print an URL for your use and watch for any changes you make to the files, which will be automatically synchronized.

## How do I ignore specific files or directories in my app so that they are not uploaded?

Create a `.vtexignore` file containing, on each line, paths you wish to ignore.
If no `.vtexignore` is found, your [.gitignore](http://git-scm.com/docs/gitignore) file is used instead.


## I don't like the default toolbelt prompt customization. It's ugly or it messes with some of my other configurations, but I still want to be able to see the account and workspace I'm logged into. What do I do?

You can do so by adding the `vtex_get_account` and `vtex_get_workspace` commands to your PS1 environment variable the way it pleases you.

---

## License

MIT
