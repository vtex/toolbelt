# VTEX Toolbelt

[![Build Status](https://travis-ci.org/vtex/toolbelt.svg?branch=master)](https://travis-ci.org/vtex/toolbelt)

All you need to start using the VTEX platform.

```sh
npm install -g vtex
```

### What is this?

VTEX Toolbelt is a command-line program that gives you access to all of the features in the VTEX platform.

With it you can:

- List, install and uninstall available apps in your account.
- List, create and remove workspaces.
- Promote an workspace to `live`, making it public in your account URL.
- Develop new apps in sandbox mode, using automatic synchronization.
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

    login <account> [login]    Log into a VTEX account
    logout                     Logout of the current VTEX account
    list [query]               List your installed VTEX apps
    watch <path>               Watch this path creating a sandbox
    install <app>              Install the specified app
    uninstall <app>            Uninstall the specified app
    publish <app>              Publish this app

    workspace list             List workspaces on this account
    workspace create <name>    Create a new workspace with this name
    workspace delete <name>    Delete this workspace
    workspace promote <name>   Promote this workspace to master

  Options:

    -h, --help  show help information
```

## Login

Start by using `vtex login <account>` to receive your credentials and be able to access other features.
Simply type this command and follow the instructions.

## Initialize an app structure

To create an app from scratch, use `vtex init` and follow the instructions.

Now you have a working app structure, let's see it running.

## Using watch

On your app directory, run `vtex watch` and click or copy the provided URL.

The `vtex` command will now monitor your files for changes and sync them automatically.

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

---

## License

MIT
