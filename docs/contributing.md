# Contributing Guide

We're glad you want to contribute!

### Local development

You can use the command `yarn watch` to test the VTEX Toolbelt locally. It creates a [_symlink_](https://en.wikipedia.org/wiki/Symbolic_link) named `vtex-test`, with which you can test your code as you develop.

To be able to use it you'll have to add `$HOME/.vtex/dev/bin` to your `PATH` environment variable. This may differ across different OSs, but follow this steps:

1. Open the `~/.bashrc` file (or the correponding shell configuration file).
2. On the end of the file, add the line: `export PATH=$PATH:$HOME/.vtex/dev/bin `.
3. Save it.
4. Run the command `source ~/.bashrc` (or corresponding file).

That's it! Now you're able to run `yarn watch` and, on another terminal session, use the command `vtex-test` as an alias to what you're developing.

### Building the binaries locally and testing them
You can build the binaries and test it locally. You can run the commands:

```
yarn build && yarn oclif-dev pack
```

A folder named `dist` will be created with all the binaries for different OS. The command below enable to use the binaries for MacOS:

```
tar -xzf /Users/fila/Code/vtex/toolbelt/dist/vtex-v4.3.0/vtex-v4.3.0-darwin-x64.tar.gz -C ~/.local/vtex # or copy it to any other folder you want
```

Now, you can use the binaries in a VTEX IO App as:

```
~/.local/vtex/vtex/bin/vtex --version # or any other command
```

### Adding commands

The VTEX CLI uses [Ocliff](https://oclif.io/) under the hood, making it very easy to add or improve commands. Follow [this guide](https://oclif.io/docs/commands) to learn how to develop on this project.


### Git workflow

We adhere to a strict pull request review workflow. Please refrain from committing any "serious" changes directly to master. Small fixes are ok. ;)

1. Create a branch from master. (e.g. `git checkout -b feature/super-awesome-thing`)
1. Submit a Pull Request.
1. Wait for comments from reviewers, discuss and fix any issues.
1. Wait for a :star2: LGTM :star2:.
1. Merge to master, delete your branch and **release to npm**.

Please do not leave any unpublished code in master!

