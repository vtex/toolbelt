# VTEX Toolbelt

[![Greenkeeper badge](https://badges.greenkeeper.io/vtex/toolbelt.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/vtex/toolbelt.svg?branch=master)](https://travis-ci.org/vtex/toolbelt)

All you need to start using the VTEX platform.

### What is this?

VTEX Toolbelt is a command-line program that gives you access to all of the features in the VTEX platform.

With it you can:

- List, install and uninstall available apps in your account.
- List, create and remove workspaces.
- Promote a workspace to `master`, making it public in your account URL.
- Develop new apps in watch mode, using automatic synchronization.
- Publish apps to the VTEX App Store.

# Getting started

The VTEX Toolbelt can be installed via [npm](https://www.npmjs.com/).
If you don't have it installed, you can get it bundled with [node](https://nodejs.org/):
 - [Linux](https://nodejs.org/en/download/package-manager/)
 - [Mac and Windows](https://nodejs.org/download/)

## Installing the VTEX Toolbelt

It's recommended that you install it globally (you may need [sudo](http://wiki.ubuntu-br.org/RootSudo) or administrative privileges):

```sh
npm install -g vtex
```

Now you can use the `vtex` command:

```sh
$ vtex
  Welcome to VTEX I/O
  Login with vtex login <account>

  Usage: vtex <command> [options]

  Commands:

    login                  Log into a VTEX account
    logout                 Logout of the current VTEX account
    list [query]           List your installed VTEX apps
    watch [log-level]      Send the files to the registry and watch for changes
    install <app>          Install the specified app
    uninstall <app>        Uninstall the specified app
    publish                Publish this app

    settings <app> [field]                     Get app settings
    settings set <app> <field> <value>         Set a value
    settings unset <app> <field>               Unset a value

    workspace list               List workspaces on this account
    workspace create <name>      Create a new workspace with this name
    workspace delete <name>      Delete this workspace
    workspace use <name>         Use a workspace to perform operations
    workspace promote <name>     Promote this workspace to master

    setup eslint      Setup a local eslint environment

  Options:

    -h, --help  show help information
```

## Login

Start by using `vtex login` to receive your credentials and be able to access other features.
Simply type this command and follow the instructions.

## Using watch

On an app directory, run `vtex watch` and click on or copy the provided URL into your browser.

The `vtex` command will now monitor your files for changes and sync them automatically.

## Customizing your prompt

If you are a _bash_ user and wish to have information regarding the account and the workspace 
you are logged in visible at your command prompt it is achievable by running the following 
command:

```sh
echo "source $(npm root -g)/vtex/scripts/prompt.bash" >> ~/.bashrc
```

Or, similarly, if you are a _zsh_ user:

```sh
echo "source $(npm root -g)/vtex/scripts/prompt.bash" >> ~/.zshrc
```

Disclaimer: _fish_ is not yet supported.

---

# Frequently Asked Questions

## How do I login?

You can use `vtex login` to login with your VTEX ID credentials or `vtex logout` if you're already logged in and want to change credentials.

When logging in, you will be asked for **3** things:

- The `account` name of the store you wish to work on
- Your VTEX ID `e-mail`
- Your VTEX ID `password`

If you wish to work on another `account`, logout and login again with that `account`.

Note that `watch` and `publish` implicitly checks if you're logged, and if you're not, it asks your credentials before proceeding.


## How do I develop an app locally?

To develop an app locally, open the directory where your VTEX app is and then type:

```sh
vtex watch
```

Toolbelt will upload all your app files to the developer environment, print an URL for your use and watch for any changes you make to the files, which will be automatically synchronized.

## How do I ignore specific files or directories in my app so that they are not uploaded?

Create a `.vtexignore` file containing, on each line, paths you wish to ignore.
If no `.vtexignore` is found, your [.gitignore](http://git-scm.com/docs/gitignore) file is used instead.


## How do I publish my App to the VTEX App Store?

To publish your VTEX app to VTEX App Store, use the `vtex publish` command. The app will be published under the vendor name.


## I don't like the default toolbelt prompt customization. It's ugly or it messes with some of my other configurations, but I still want to be able to see the account and workspace I'm logged into. What do I do?

You can do so by adding the `vtex_get_account` and `vtex_get_workspace` commands to your PS1 environment variable the way it pleases you.

---

## License

MIT
