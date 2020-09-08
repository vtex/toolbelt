**Table of contents**

- [Applications supporting toolbelt core](#applications-supporting-toolbelt-core)
- [Entrypoint](#entrypoint)
- [Local Metadata](#local-metadata)
- [Toolbelt config server](#toolbelt-config-server)
- [Init Hook and CLIPreTasks](#init-hook-and-clipretasks)
- [Telemetry](#telemetry)
  - [Errors](#errors)
  - [Metrics](#metrics)
- [Appendix A: The fire and forget child_process pattern](#appendix-a-the-fire-and-forget-child_process-pattern)

## Applications supporting toolbelt core

VTEX IO Apps:

- [vtex.toolbelt-config-server](https://github.com/vtex/toolbelt-config-server): See
  [Toolbelt config server](#toolbelt-config-server).
- [vtex.toolbelt-telemetry](https://github.com/vtex/toolbelt-telemetry): See
  [Telemetry](#telemetry).

NPM Packages:

- [@vtex/toolbelt-message-renderer](https://github.com/vtex/toolbelt-message-renderer): See
  [Toolbelt config server](#toolbelt-config-server).
- [@vtex/node-error-report](https://github.com/vtex/node-error-report): See [Telemetry](#telemetry).
- [@vtex/api](https://github.com/vtex/node-vtex-api/tree/3.x): Provides the HTTP clients used by
  toolbelt to interact with VTEX services and VTEX IO services and apps.

## Entrypoint

The CLI entrypoint script is placed on `bin/run`. This script is written in javascript and is
responsible for starting up OCLIF and requiring
[`v8-compile-cache`](https://www.npmjs.com/package/v8-compile-cache) (ideally the `require` for
`v8-compile-cache` should be before any other `require` or `import` happens), which is responsible
for speeding js compilation a little (improved init times for our CLI).

Toolbelt's `package.json` refer this file on the `bin` field (`"bin": "bin/run"`), specifying for
package managers (`npm`, `yarn`, etc) that this script is a binary and should be exposed to the user
as such (just as a curiosity you can check the symlinks `yarn` creates for the global binaries:
`ls -l $(yarn global bin)`).

<details> 
  <summary> <b> <i> How the terminal resolves a command? </b> </i> </summary>

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
  <summary><i><b> Identifying the path the terminal resolved for the CLI  </i></b></summary>

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
  <summary><i><b> Using Chrome's debugger when running the CLI </i></b></summary>

Sometimes using a debugger to follow step by step our code is useful. In order to use this in the
CLI we'll have, as of now, to run `bin/run` manually like this:

```
$ node --inspect-brk bin/run commandIWantToDebug
Debugger listening on ws://127.0.0.1:9229/c4585756-4cbb-48ed-8871-29f22b617ba0
For help, see: https://nodejs.org/en/docs/inspector
```

Now you can go to `chrome://inspect` in your chrome and you'll see:

You can open the `inspect` link and then start debugging this command execution.

**TIP**: you can add the keyword `debugger` in parts of your code and then de debugger will create a
breakpoint there:

```ts
const fn = () => {
    ... // do things
    debugger // want to stop here
    ... // do more things
}
```

</details>

## Local Metadata

Toolbelt creates a directory for storing data on the user's filesystem. As of now the directory it
uses is `$HOME/.vtex`, with some subdirectories:

- `pretasks/`: This directory is used by the CLI pre-tasks for persisting information.
- `telemetry/`: This directory is used by toolbelt's telemetry system, for persisting telemetry
  locally until it's decided to report to the `toolbelt-telemetry` app.
- `logs/`: This directory is used to persist logs.
- `session/`: This directory is used to persist data regarding the user's session (account,
  workspace, token).

All of these paths are defined as constants on the `PathConstants` class.

## Toolbelt config server

The [`vtex.toolbelt-config-server`](https://github.com/vtex/toolbelt-config-server) app was created
for us to be able to create dynamic toolbelt configurations (not hardcoded on a version's code) and
be able to easily change these configurations via an API. This app runs on VTEX IO, on the `vtex`
account, workspace `master` and to make interactions with it easier a CLI was created, the
[`toolbelt-config-cli`](https://github.com/vtex/toolbelt-config-cli).

The updated list of configurations `toolbelt-config-server` provides is available
[here](https://github.com/vtex/toolbelt-config-server#configs).

Also, `toolbelt-config-server` can be used to serve toolbelt messages and logs that need to be
dynamic (they are frequently modified and we want all toolbelt users to see the most updated version
of them). The messages that can be added follow a templating scheme
([toolbelt-message-renderer](https://github.com/vtex/toolbelt-message-renderer)) that allow us to
add colors to the messages, emojis and surrounding boxes. The updated list of messages provided by
`toolbelt-config-server` is available
[here](https://github.com/vtex/toolbelt-config-server#messages).

Lastly, `toolbelt-config-server` provides a route to validate a version (check for outdated). Both
toolbelt and builder-hub use this feature (builder-hub doesn't allow outdated toolbelt versions to
link or publish - it can identify the toolbelt version based on the `user-agent` header: all
toolbelt requests should properly setup this header).

Check the [`toolbelt-config-server` repository](https://github.com/vtex/toolbelt-config-server) and
[`toolbelt-config-cli` repository](https://github.com/vtex/toolbelt-config-cli) for more useful
information.

## Init Hook and CLIPreTasks

OCLIF provides the feature of [lifecycle hooks](https://oclif.io/docs/hooks#lifecycle-events) and
one of the hooks it exposes is the `init` hook. In toolbelt we use this feature for setting up error
handling and running the so called CLI pre-tasks, which are tasks and checks made on every command
run (with some optimizations). Some checks are crucial for the correct operation of the CLI, so the
CLIPretasks may block the user from running commands (this behavior can be worked aroung using the
`IGNORE_CLIPRETASKS=*` environment variable) - as of now the tasks executed are:

- **Ensure compatible node version**: Some features used by toolbelt require a minimum node.js
  version.
- **Remove outdated paths**: Earlier toolbelt versions used other local metadata directories, we
  don't want to pollute the user computer, so check if these old directories exist and delete them.
- **Check for deprecation**: Package managers don't enforce the user to use a undeprecated version -
  this check is necessary to ensure users don't use a deprecated version. The deprecation check is
  made by calling the npm API.
- **Check for outdated**: This is a way to ensure users use a minimum toolbelt version specified by
  us. The outdated check is made by calling `toolbelt-config-server`.

Some of these tasks are very simple and fast to be executed, others need to make external requests -
these may delay the main command from being executed or delay giving back terminal control to the
user, so we use the pattern explained on
[Appendix A](#appendix-a-the-fire-and-forget-child_process-pattern) - we create a fire and forget
child process responsible for doing a status check for the desired information.

<details>
  <summary><i><b> How checking for outdated or deprecation works </i></b></summary>

These tasks follow the same pattern. Each one of them have a storage in the format of a json at
`~/.vtex/pretasks/` where the status check result and last status check date will be persisted,
e.g.:

```json
// outdated-checking.json
{
  "outdatedInfo": {
    "versionChecked": "2.110.1",
    "outdated": false
  },
  "lastOutdatedCheck": 1598632562481
}
```

Whenever the user runs a command, the CLI pre-task for these checks will be executed - it will read
this json storage and will, in some cases, will spawn the fire and forget child process for updating
the status. In the case of checking for outdated these cases are the following:

- The toolbelt version being used doesn't match with the version checked on the storage.
- The current version is outdated (if it's outdated makes sense to do a check every time - what if
  we change our mind about outdating and update the data on `toolbelt-config-server`?).
- The last status update was long time ago (this check interval is defined in a constante).

In these cases the child process will be spawned and it will update the json storage with the latest
information.

</details>

<details>
  <summary><i><b> Debugging toolbelt's fire and forget child processes </i></b></summary>

As described in [Appendix A](#appendix-a-the-fire-and-forget-child_process-pattern), the fire and
forget child processes created doesn't inherit the parent stdio, so we don't get to see their
outputs, making it difficult to debug them. We created a workaround to this by means of an
environment variable: `DEBUG_CP=*`. Whenever we run a CLI command with this environment variable set
the child processes will inherit the parent's stdio, so we'll be able to see the child processes'
outputs.

</details>

## Telemetry

Toolbelt collects anonymous telemetry data from users - usage metrics, execution metrics (init
timings for example) and errors. This is very important for us to have data to improve user
experience and debug errors that happened with our users.

All this telemetry data is collected on the client and sent to the
[vtex.toolbelt-telemetry](https://github.com/vtex/toolbelt-telemetry) app, which logs it to splunk -
making it available to query. In order to be able to interact with `vtex.toolbelt-telemetry` (send
telemetry) the user has to be logged - if the user is not logged, telemetry will be stored until the
moment the user is logged, and then the data is sent.

<details> 
  <summary><i><b> How toolbelt collects and reports metrics? </i></b></summary>

Currently toolbelt collect and reports metrics using the modules `TelemetryCollector` and
`TelemetryReporter`. The `TelemetryCollector` is a singleton created on every command execution and
it exposes functions to register an error or metric to be reported. When something is registered
during the command's execution it's added on an array. At the end of the command execution, when
toolbelt is about to exit, the `flush` function from the collector is called. This function will
decide whether the script responsible for reporting the data to `vtex.toolbelt-telemetry` will be
executed or not:

- If it decides not to execute the script then the collected data will only be written to a local
  disk store (at the telemetry directory `~/.vtex/telemetry` - see
  [Local Metadata](#local-metadata)).
- Otherwise it resets the local disk store and writes all data into a file named randomly, at the
  `~/.vtex/telemetry` directory. Then it starts the telemetry reporter script as a fire and forget
  child process (see [Appendix A](#appendix-a-the-fire-and-forget-child_process-pattern)) passing
  this file name as argument.

The telemetry reporter script tries to report telemetry to `vtex.toolbelt-telemetry` - it tries to
send the file received as argument of the script and all the files on
`~/.vtex/telemetry/pendingData`, which has files from previous unsuccessful executions of the
reporter script (if a report of a file is unsuccessful this file is moved to `pendingData`, for new
report tries in the future). Meta metrics of the report script (e.g., init time, `pendingData` files
count) and telemetry report errors (`errorKind=TelemetryReporterError`) are also written in the
`pendingData` folder, for the next report attempt.

A note on the report script is that many processes running the script may be running simultaneously
(the user ran many toolbelt commands and each command may have started the report script). To avoid
concurrency problems on the `pendingData` folder, each script tries to hold a file lock located on
`pendingData` whenever it tries to report the files there.

</details>

### Errors

All toolbelt errors reported to `vtex.toolbelt-telemetry` are wrapped around the `ErrorReport`
class, which in turn extends the `ErrorReportBase` class, from the
[`@vtex/node-error-report`](https://github.com/vtex/node-error-report) package. The
`ErrorReportBase` class is responsible for parsing errors (for example axios errors), token
sanitization, strings truncation (in case of big strings) - for more info check the
[repository](https://github.com/vtex/node-error-report). The `ErrorReport` class extends the
`ErrorReportBase` adding toolbelt specific functionality, for example it adds metadata on the
current toolbelt version and environment the user is running on.

All errors created are associated with an `ErrorID`, which is usually shown to the user when an
error happens. This `ErrorID` can be used to query the error on splunk:

```
index=io_vtex_logs app=vtex.toolbelt-telemetry* $ErrorID
```

Errors can also be annotated with a custom `ErrorKind`, which are all defined on the `ErrorKinds.ts`
file (except the generic ones from `@vtex/node-error-report` - `RequestError` and `GenericError`).
This may provide a way for us to aggregate similar errors and have better understanding on where
errors are happening - we can query errors with a specific kind on splunk like this:

```
index=io_vtex_logs app=vtex.toolbelt-telemetry@* data.kind=TelemetryReporterError
```

### Metrics

The class responsible for wrapping a metric is the `MetricReport` class - it adds some metadata to
the metric specifying the environment in which the user is running, for example the OS or the
toolbelt version. Every metric has a name specifying what is it measuring - all metric names are
located on the `MetricNames.ts` file. You can query toolbelt metrics on splunk:

```
index=io_vtex_logs app=vtex.toolbelt-telemetry@* data.metric.$metricName!=NULL
```

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
