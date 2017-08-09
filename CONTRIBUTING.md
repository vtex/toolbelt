# Contributing Guide

We're glad you want to contribute!

### Git workflow

We adhere to a strict pull request review workflow. Please refrain from committing any "serious" changes directly to master. Small fixes are ok. ;)

1. Create a branch from master. (e.g. `git checkout -b feature/super-awesome-thing`)
1. Submit a Pull Request.
1. Wait for comments from reviewers, discuss and fix any issues.
1. Wait for a :star2: LGTM :star2:.
1. Merge to master, delete your branch and **release to npm**.

Please do not leave any unpublished code in master!

### Adding commands

Adding commands to the Toolbelt is very easy.  
All commands are implemented by JavaScript files in the `src/modules/` directory.  
These files `export` a JavaScript object containing one `command` for each key.  
The `key` in this object will be the command name, and the value is an object containing, at least, a `handler` function.  
Handler functions **should return a Promise**.
You can either add a command to an existing file, or create a new one.  
Here's an example for a very simple command:

```js
export default {
  login: {
    requiredArgs: 'account',
    optionalArgs: 'login',
    description: 'Log into a VTEX account',
    handler: (account, login) => {
      // Do something interesting and return a Promise
      return Promise()
    },
  },
}
```

For advanced usage information, see [findhelp](https://github.com/vtex/findhelp), the library used to parse commands in the toolbelt.
