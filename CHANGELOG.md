### v0.10.1 (2015-10-28)

Fix signalr-client dependency.

---

### v0.10.0 (2015-10-27)

Hello, fellow developers!

I'm glad to announce that **THE COOKIE IS DEAD!!11!!**

Ok... maybe not that much. Let me explain:

The cookies for the `sandbox` and `workspace` pretty much still exists, **BUT**, we've created a good and ol' barrel of abstraction on top of it so you don't have to worry anymore.

Now we have a convention for setting those cookies. We will create a workspace with the the name `sb_<your-vtex-developer-email>` and on that workspace you'll have a sandbox with the name `<your-vtex-developer-email>`. Because of that, you don't need to type the `sandbox` as an argument of `watch` anymore!

You will access those by simply putting a querystring on the link you use for development, for example: `storename.beta.myvtex.com/?workspace=sb_mydeveloperemail@whut.com`.

All we ask in return is that when you log in you inform us the account you wish to be logged (yeah, only one account at a time).

I know you're excited, yeah, gimme a hug homie <3

**TL;DR:** You don't need to type the sandbox name on `watch` or set the cookies anymore.

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
