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

