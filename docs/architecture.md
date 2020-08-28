## Entrypoint

The CLI entrypoint script is placed on `bin/run`. This script is written in javascript and is
responsible for starting up OCLIF and requiring
[`v8-compile-cache`](https://www.npmjs.com/package/v8-compile-cache) (ideally `v8-compile-cache`
should be `require`d before any other require or import happens), which is responsible for speeding
js compilation a little (improved init times for our CLI).

Toolbelt's `package.json` refer this file on the `bin` field (`"bin": "bin/run"`), specifying for
package managers (`npm`, `yarn`, etc) that this script is a binary and should be exposed to the user
as such (just as a curiosity check the symlinks `yarn` creates for the global binaries:
`ls -l $(yarn global bin)`).

<details> 
  <summary> How the terminal resolves a command? </summary>

When we run:

```
$ vtex
```

The terminal uses the `PATH` environment variable to resolve the command given to an executable. The
PATH variable in bash has the following format:

```
$ echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

It is a list of colon separated strings, each one representing an absolute path in the file system
in which the terminal will lookup for an executable. So when we run `vtex`, the terminal will look
up each directory in the `PATH` list searching for an executable file named `vtex`, and as soon as
it finds it, it will execute it.

This is sometimes a source of installation bugs, for example, when we install `yarn` we have to
configure our `PATH` variable to add `yarn`'s global binaries path (see `PATH` setup
[here](https://classic.yarnpkg.com/en/docs/install/)), so when we run a command installed with
`yarn` the terminal will be able to resolve this command to a binary installed by `yarn`.

In bash adding a new path to `PATH` is simple, we just have to add to our `~/.bashrc` the following
line and restart terminal sessions
([more details and troubleshooting](https://unix.stackexchange.com/questions/26047/how-to-correctly-add-a-path-to-path)):

```
export PATH=$PATH:new/path
```

We can also take advantage of the `PATH` variable to improve our local workflows. An example is what
was made in this repository, for local CLI development and testing. In order to test locally the CLI
we have to build the typescript code and then run the entrypoint js script at `bin/run`. If we want
to run the CLI on any other directory other than the repository itself we have to either use the
absolute path to `bin/run` or use the relative path to `bin/run`. A solution to facilitate this is
creating a symlink to `bin/run` named whatever we want (we named `vtex-test`) in a diretory that is
on `PATH`. Then when we run `vtex-test` the terminal will resolve this command to the symlink, which
will be resolved to `bin/run`, an executable script - voilà, `vtex-test` runs our local version of
the CLI. The problem with this solution is that usually directories on `PATH` need `sudo` to be
modified - we solved this by ask the developer to add a new path to his/her `PATH` - the `vtex-test`
symlink will be created there.

</details>

<details>
  <summary> Identifying the path the terminal resolved for the CLI  </summary>

Sometimes it's useful to identify the path to which the terminal resolved the command `vtex`. For
example, if we have multiple package managers installed, when we run `vtex` the command is being
resolved to the binary installed by which package manager? In case a user is having a bug, does the
binary `vtex` is pointing to is correct?

In order to identify this resolution path it's simple:

```
$ which vtex
/home/jessepinkman/.yarn/bin/vtex
```

The above example shows that `vtex` is being resolved to a `yarn` installation. Another example is a
`npm + nvm` installation:

```
$ which vtex
/home/jessepinkman/.nvm/versions/node/v12.18.3/bin/vtex
```

Or the `vtex-test` local testing command:

```
$ which vtex-test
/home/jessepinkman/.vtex/dev/bin/vtex-test
```

</details>

<details>
  <summary> Using Chrome's debugger when running the CLI </summary>

Sometimes using a debugger to follow step by step our code is useful. In order to use this in the CLI we'll have, as of now, to run `bin/run` manually like this:
```
$ node --inspect-brk bin/run commandIWantToDebug
Debugger listening on ws://127.0.0.1:9229/c4585756-4cbb-48ed-8871-29f22b617ba0
For help, see: https://nodejs.org/en/docs/inspector
```
Now you can go to `chrome://inspect` in your chrome and you'll see:

You can open the `inspect` link and then start debugging this command execution. 

**TIP**: you can add the keyword `debugger` in parts of your code and then de debugger will create a breakpoint there:
```ts
const fn = () => {
    ... // do things
    debugger // want to stop here
    ... // do more things
}
```
</details>

## Appendix A: The fire and forget child_process pattern

Usually when we create a child_process in Node.js the parent process will have to wait for the child
to finish before it can exit. In a CLI this is undesirable - imagine the user runs a command that is
super fast in nature, and the CLI's main process that will run the command creates a child process
which does slow operations. What will happen is that the main process will not exit until the child
process finishes, and the control of the terminal will not be given back to the user until this
happens:

```
$ vtex super:fast:command
The super fast command output
The command is finished now
... [time has passed and the prompt hasn't show up again - the control wasn't given to the user yet]
...
... [the user is still waiting]
...

$ [the node.js application has finished]
```

There's an easy solution to this however, which we use in our codebase:

```
const { spawn } = require('child_process');

const subprocess = spawn(process.argv[0], ['child_program.js'], {
  detached: true,
  stdio: 'ignore'
});

subprocess.unref();
```

Explanation:

- `detached: true`: The `detached` option tells node to spawn a child_process that may continue its
  execution after the parent exists
  ([docs](https://nodejs.org/api/child_process.html#child_process_options_detached)).
- `stdio: 'ignore'`: If the stdio is inherited the child process output will be sent to the terminal
  even after the parent exists, which is undesirable
- `.unref()`: This removes the reference to the child process from the parent's event loop, meaning
  that the parent won't have to wait for the child_process to finish for it to be able to exit.

This way the user won't even notice that we spawned a child process, since the main CLI's process
will give back control to the user as soon as it exists:

```
$ vtex super:fast:command
The super fast command output
$ [the child process may still be running, but the user has already received control back]
```
