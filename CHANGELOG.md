### [Unreleased]
Features:
- `vtex release` command analogous to `releasy`

Features:
- Enable running commands inside subdirectories

### v2.35.0 (2018-01-17)

Features:
- Add `--short` option to `list`

### v0.19.2 (2016-05-19)

Travis deploy test

---

### v0.19.1 (2016-05-19)

Travis deploy test

---

### v0.19.0 (2016-05-19)

Breaking:
- Change stable endpoints to new apps and workspaces model

Fixes:
- `webpack-dev-server` redirect without port

Updates:
- `shelljs` to v0.7.0
- `update-notifier` to v0.7.0

---

### v0.18.0 (2016-04-19)

Features:
- Add `ora` spinner

Fixes:
- Dev workflow
- `vtexsay` message

---

### v0.17.1 (2016-04-18)

Fixes:
- `update-notifier` missing dependency

---

### v0.17.0 (2016-04-18)

Features:
- Add `update-notifier`

Updates:
- `eslint-plugin-react` to v5.0.1
- Add the sandbox name on webpack's `publicPath`

---

### v0.16.0 (2016-04-14)

Breaks:
- From `meta.json` to `manifest.json`
- `.vtexrc` is now a JSON file

Updates:
- `eslint-config-vtex` to v3.0.1
- `archiver` to v1.0.0
- `babel-eslint` to v6.0.2

Fixes:
- `babel-eslint` dependency version

---

### v0.15.1 (2016-03-01)

Fixes:
- [Fix unbalanced parentheses](https://github.com/vtex/toolbelt/commit/8eb49411895d1b639f2e4b0e7d7408cfc3714bed)

---

### v0.15.0 (2016-03-01)

Breaks:
- `.vtexrc` instead of using `GalleryEndpoint` now uses `AppsEndpoint` and `WorkspacesEndpoint`

Fixes:
- [Fix chalk usage](https://github.com/vtex/toolbelt/commit/fb974d345f5480fb5879ce7971c3f6fa3e34d3d2)
- [Use stable gallery endpoints](https://github.com/vtex/toolbelt/commit/abe9b41f04c644e9e5ca3ca6211a01b88b78ee45)

Updates deps:
- shelljs -> 0.6.0
- glob -> 7.0.0
- node-libs-browser -> 1.0.0
- prompt -> 1.0.0
- eslint -> 2.0.0
- babel-eslint -> 5.0.0
- eslint-plugin-react -> 4.1.0

---

### v0.14.1 (2016-01-01)

Update some deps and fix login error with start token.

---

### v0.14.0 (2015-12-21)

`node_modules`, `package.json` and `.git` are ignored by default.

---

### v0.13.2 (2015-12-14)

Fix undeclared `rl` var on windows.

---

### v0.13.1 (2015-12-09)

We dumped CoffeeScript in favor of ES6! Since all the code was deleted and written in ES6, you may encounter some issues, if you do, please open an issue.

Improvements:
- Improve error handling
- Show publish error details

Fixes:
- Fix grammar in some messages
- [`#73`](https://github.com/vtex/toolbelt/issues/73)

---

### v0.13.0 (2015-11-19)

#### BREAKING CHANGE, PLEASE UPDATE

It updates the JSON we send to the gallery! Just that :)

- [`#82`](https://github.com/vtex/toolbelt/issues/82)

---

### v0.12.0 (2015-11-06)

Add special auth method for `@vtex.com` or `@vtex.com.br` e-mails.

---

### v0.11.0 (2015-11-05)

On this update we changed the way we tell Storefront that you're watching a new app!
Instead of WebSockets, we now use HTTP for keep alive, not as elegant but made a few bugs disappear.

We also added a message on `vtex login` to make the prompts less ambiguous. Still on the login, there's now a validation on the `account` prompt! It should be alphanumeric with only dashes `-` as a special character.

- [`#73`](https://github.com/vtex/toolbelt/issues/73)
- [`#72`](https://github.com/vtex/toolbelt/issues/72)

---

### v0.10.4 (2015-10-30)

Fix location of warnings in sandbox changes.

---

### v0.10.3 (2015-10-29)

Fix disconnection issue when exiting by Ctrl + C and workspace creation request.

- [`#69`](https://github.com/vtex/toolbelt/issues/69)

---

### v0.10.2 (2015-10-28)

Fix login message when using Ctrl + C to exit the prompt and moar error messages.

---

### v0.10.1 (2015-10-28)

Fix signalr-client dependency.

---

### v0.10.0 (2015-10-27)

Hello, fellow developers!

I'm glad to announce that **THE COOKIE IS DEAD!!11!!**

Ok... maybe not that much. Let me explain:

The cookies for the `sandbox` and `workspace` pretty much still exists, **BUT**, we've created a good and ol' barrel of abstraction on top of it so you don't have to worry anymore.

Now we have a convention for setting those cookies. We will create a workspace with the name `sb_<your-vtex-developer-email>` and on that workspace you'll have a sandbox with the name `<your-vtex-developer-email>`. Because of that, you don't need to type the `sandbox` as an argument of `watch` anymore!

You will access those by simply putting a querystring on the link you use for development, for example: `storename.beta.myvtex.com/?workspace=sb_mydeveloperemail@whut.com`.

All we ask in return is that when you log in you inform us the account you wish to be logged (yeah, only one account at a time).

I know you're excited, yeah, gimme a hug homie <3

**TL;DR:** You don't need to type the sandbox name on `watch` or set the cookies anymore.

# !!!

---

**First big important note:** If you have any credentials cached, please `logout` and `login` again.

**Second big important note:** Delete the previous `vtex_workspace` and `vtex_sandbox` cookies that you have setted before.

---

# !!!

- [`#58`](https://github.com/vtex/toolbelt/issues/58)
- [`#48`](https://github.com/vtex/toolbelt/issues/48) (closed due to deprecation)

---

### v0.9.4 (2015-10-22)

Update changes log to include warnings from server response.

- [`#60`](https://github.com/vtex/toolbelt/issues/60)

---

### v0.9.3 (2015-10-06)

Just a small patch.

Now, server sets an environment variable called `HOT` (dayum yeah).

- [`#55`](https://github.com/vtex/toolbelt/issues/55)

---

### v0.9.2 (2015-09-28)

Hello again, fellas.

Today we have a round of the good ol' fixes.

Users of the `npm@3` version will be glad to know that the dependencies issues were handled. `tiny-lr` got updated and everything is now beautifully working. Also, removed `grunt-coffeelint` for having peer dependencies issues too.

I hope that people get a little less confused when running the toolbelt when he doesn't need to send anything to the sandbox servers. Why? Well, we got a new message just for that case :)

And, for the finale, the toolbelt will warn you properly when the port of the server is occupied. I think that shows good manners, exploding the way it used before doesn't show you have good loving parents!

- [`#43`](https://github.com/vtex/toolbelt/issues/43)
- [`#49`](https://github.com/vtex/toolbelt/issues/49)
- [`#51`](https://github.com/vtex/toolbelt/issues/51)
- [`#53`](https://github.com/vtex/toolbelt/issues/53)

---

### v0.9.1 (2015-09-26)

Nothing big here, just fixes some issue with the `watch` command when running with no flags.

- [`#50`](https://github.com/vtex/toolbelt/issues/50)

---

### v0.9.0 (2015-09-24)

Let's kick the dust off and start with the good stuff!

The file `vtex-webpack` is now **gone** (we won't miss you, so k bye). Now we have a new one, shiny and pretty called `webpack` (yep), it lives on the `lib` folder.

The logic behind the `-w` and `-s` options is now there, and the entrypoint for them is now on `vtex-watch`, which makes much more sense since they are options of **watch**.

Last but not least, the VTEX Toolbelt server now uses the new [react-transform](https://github.com/gaearon/react-transform)!

Instead of using `webpack-dev-server	`, we're using an `express` server with `webpack-hot-middleware` and `webpack-dev-middleware`. Note that `webpack-dev-middleware` doesn't write anything on disk and handles everything in memory, so don't freak out if you see your `assets` folder sitting there all alone.

This assumes some pre-configuration on the project to work properly (see [Hot Module Replacement](https://github.com/vtex/toolbelt#hot-module-replacement) section on README). Besides, it's a world of new possibilities and probably makes it easier to make the dreamy multiple app hot reload that we all want!

On this release two main issues are fulfilled (actually, one is partially done):

- [`#44`](https://github.com/vtex/toolbelt/issues/44) (this is the partially one)
- [`#35`](https://github.com/vtex/toolbelt/issues/35)
