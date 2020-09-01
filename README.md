# VTEX Toolbelt

[![Build Status](https://travis-ci.org/vtex/toolbelt.svg?branch=master)](https://travis-ci.org/vtex/toolbelt) [![npm version](https://img.shields.io/npm/v/vtex.svg?style=flat)](https://www.npmjs.com/package/vtex) [![Greenkeeper badge](https://badges.greenkeeper.io/vtex/toolbelt.svg)](https://greenkeeper.io/)

The CLI that offers all you need to start using the VTEX IO platform efficiently.

#### Summary
- [How do we empower you?](#how-do-we-empower-you)
- [First step: Installing the VTEX Toolbelt](#installing-the-toolbelt-with-yarn)
- [Developing an app locally](#to-develop-locally-use-vtex-link)
- [Customize your prompt](#wanna-know-something-cool-you-can-customize-your-prompt)
- [FAQ](#frequently-asked-questions)
- [Contributing](#contributing)
- [Send us feedback](#tell-us-what-you-think-about-toolbelt)

# How do we empower you? 

VTEX Toolbelt is a command-line program that gives you access to all of 
the features in the VTEX platform and increases your productivity, allowing you to:

- **Manage your apps quickly:** List, install and uninstall available apps in your account;
- **Work safely on your personal environments:** List, create and remove workspaces;
- **Easily ship changes to your final user:** Promote a workspace to `master`, making it public in your account URL;
- **See what you are creating in real time:** Develop new apps in link mode, using automatic synchronization;
- **Go live from the command line:** Publish apps to the VTEX App Store.

# Getting started: Installing the VTEX Toolbelt
To use the VTEX Toolbelt, you'll need to install other engines 
that will also be useful when developing for VTEX.

#### Node.js to run the tool
- Install Node.js [here](https://nodejs.org/en/download/): Toolbelt is written in Typescript and designed to run on Node.js. 
(Node is the runtime that executes the JS and allows our tool to run and work at your computer) 
- Install yarn [here](https://classic.yarnpkg.com/en/docs/install): yarn is a way to manage your code, organize content in packages 
that you can download, share and... install, just like our CLI :) 

Already has Node.js and Yarn? Let's install the Toolbelt. 

#### Installing the Toolbelt with yarn
`yarn` powers app development to React, Node and VTEX IO! Install the Toolbelt using yarn and start working with us generating automatically all the files you'll need to create apps in the future. 
To install it, run: 
 
 ```
 yarn global add vtex
 ```

<details>
  <summary>Alternative installation method using npm</summary>
  You can install using `npm`. But remember, if in the future 
  you want to develop a VTEX IO app, you'll need to install `yarn` 

  To install with `npm`, run:

  ```
  npm install -g vtex
  ```
</details>

# Using the CLI 

After installation, run `vtex` to see our commands and what each one of them do.

<details>
    <summary>Or, check all our commands here</summary>

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
      logs                    Show apps production logs
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
</details>

# Second step: log into your VTEX account

Start by using `vtex login` to receive your credentials and be able 
to access other features. Simply type this command and follow the instructions.

<details>
<summary>Having trouble with login? Follow these steps</summary>

You can use `vtex login` to login with your VTEX ID credentials or vtex logout if you're already logged in and want to change credentials.

When logging in, you will be asked for 3 things:
- The `account` name of the store you wish to work on, that would be your company or clients `account` name;
- Your VTEX ID email, the one you received access to work with VTEX. Missing the email? Send us a message here.
- Your VTEX ID password, the one you chose when creating your user. 

If you wish to work on another `account`, run `vtex switch <account>` specifying the account you want to move to.

</details>

> 😉 Note that `link` and `publish` implicitly checks if you're logged, and if you're not, it asks your credentials before proceeding.

# To develop locally: use vtex link

When you log in to an account, you can create your own workspaces to work on your ideas or see what is in production. To do so:

1. On an app directory, run `vtex link` and click on or copy the provided URL into your browser;
2. Now on, VTEX Toolbelt will monitor your files for change and sync them with what you see automatically. 

<details>
<summary>Know more about local development with Toolbelt</summary>

Toolbelt will upload all your app files to the developer environment, print an URL for your use, and watch for any changes you make to the files, which will be automatically synchronized.

</details>


# Wanna know something cool? You can customize your prompt

You can configure your **terminal prompt** to display relevant information about your current context, like which account you're logged into and which `workspace` you are currently using.

Just like knowing which `git` branch you're currently in, having this info in your prompt will help you avoid mistakes and be faster when using VTEX IO.

## How to do so? 

#### `bash` users

If you are a bash user you can start customizing your command prompt by running the following command:

```sh
echo "source $(npm root -g)/vtex/plugins/bash/vtex.bash" >> ~/.bashrc
echo "source $(npm root -g)/vtex/plugins/bash/prompt.bash" >> ~/.bashrc
```

> 😉 For fine grained control, use only the first script and add `__vtex_ps1` manually to your prompt.

#### `fish` users

If you want a pretty, ready-made Git + VTEX prompt you can copy `plugins/fish/fish_prompt.fish` to the  `~/.config/fish/functions` folder. To see the changes, simply restart your shell by typing `fish`.

```sh
cp (npm root -g)/vtex/plugins/fish/fish_prompt.fish ~/.config/fish/functions/
fish
```

> 💡 If you installed Toolbelt using `yarn`, you should replace `(npm root -g)` with `(yarn global dir)`.

---

# Frequently Asked Questions

<details>
<summary>How do I ignore specific files or directories in my app so that they are not uploaded?</summary>

Create a `.vtexignore` file containing, on each line, paths you wish to ignore.
If no `.vtexignore` is found, your [.gitignore](http://git-scm.com/docs/gitignore) file is used instead.

</details>

<details>
<summary>Is there another way to customize the prompt?</summary>

You can do so by adding the `vtex_get_account` and `vtex_get_workspace` commands to your PS1 environment variable the way it pleases you.

</details>


---
## Contributing

Follow the steps on [CONTRIBUTING.md](./docs/CONTRIBUTING.md).

## License

MIT

## Tell us what you think about Toolbelt  
📡 We are always looking for ways to improve your experience. Please, send us feedback about the **VTEX Toolbelt** [here](https://forms.gle/hA7mGGdPBm5ssCUh9).
