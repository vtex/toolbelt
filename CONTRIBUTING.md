# Contributing Guide

We're glad you want to contribute! Adding commands to the Toolbelt is very easy.  
All commands are implemented by JavaScript files in the `src/modules/` directory.  
These files `export` a JavaScript object containing one `command` for each key.  
The `key` in this object will be the command name, and the value is an object containing, at least, a `handler` function.  
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
