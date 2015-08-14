# VTEX Toolbelt

CLI tool for developing VTEX apps.

# Getting started

The VTEX Toolbelt can be installed via [npm](https://www.npmjs.com/).
If you don't have it installed, you can get it bundled with [node](https://nodejs.org/):
 - [Linux](https://gist.github.com/isaacs/579814)
 - [Mac and Windows](https://nodejs.org/download/)

## Installing the VTEX Toolbelt

It's recommended that you install it globally (you may need [sudo](http://wiki.ubuntu-br.org/RootSudo) or administrative privileges):

```sh
npm install -g vtex
```

## Warming up

Remember that your project needs to meet some requirements to work:

1. You need to have a VTEX ID credential in order to send the files to the sandbox or publish an app
2. Your app must have a proper `meta.json`, here's an example:

    ```javascript
    {
        “name”: “app-name”,
        “version”: “0.2.0”,
        “vendor: : “vtex”
    }
    ```

4. You must properly set `vtex_sandbox` cookie

    > The sandbox is used to test your apps that aren't published yet.
    > You'll use a sandbox only if you're a VTEX apps developer.
    
    The sandbox it's a alternative version of an app that only you see under development.
    
    We need to tell to Storefront that we'll use a new sandbox. We do that by defining a special cookie on the browser, with the name `vtex_sandbox` and the value `vtex/mysandbox=myapp`.
    
    In order to do that, we can use a browser extension that eases the manipulation of cookies. If you use Chrome, we recommend the [Cookie Inspector](https://chrome.google.com/webstore/detail/cookie-inspector/jgbbilmfbammlbbhmmgaagdkbkepnijn?utm_source=chrome-app-launcher-info-dialog). To create a new cookie open the Developer Tools and click on the Cookies tab. Then you can click with the right mouse button and choose the "Add New Cookie".
    
    Edit this cookie with the following properties:
    
    Name|Value
    ---|---
    vtex_sandbox|vtex/mysandbox=myapp

## Developing an app

> If you need help with the structure of your project or you just don't want to spend the time with this tinkering, you can use our [generator](https://open.spotify.com/track/5mCprFWOqe0jB96v9RhLBo)!

On the root of your project, run the `vtex watch <sandbox-name>`.

That should do it! The VTEX Toolbelt watcher will be monitoring your files and send them to the VTEX Gallery as soon as you edit them.

For more information on the commands, options and other configs, you can seek more information below!

---

# Auth

You can use `vtex login` to login with yout VTEX ID credentials or `vtex logout` if you're already logged in and want to change credentials.

Note that `watch` and `publish` implicitly checks if you're logged, and if you're not, it asks your credentials before proceeding.

# Watch

To develop an app locally, open the directory where your VTEX app is and then type:

```sh
vtex watch <sandbox-name>
```

You are free to set any name you want in the `sandbox-name` parameter, as long as it contains only letters, numbers, underscores and hyphens.

VTEX Toolbelt will upload all your app files to the sandbox specified and will be watching for any changes you make to them.

There's other forms of use too, if you use the options:

Option|Alias
---|---
`vtex watch --webpack <sandbox-name>`|`vtex watch -w <sandbox-name>`
`vtex watch --server <sandbox-name>`|`vtex watch -s <sandbox-name>`

## Webpack

You can run the VTEX Toolbelt watcher in parallel with the [Webpack](http://webpack.github.io/) watcher if you use the `--webpack` option under the `watch` command.

Make sure that you have a well configured and working [webpack.config.js](http://webpack.github.io/docs/tutorials/getting-started/#config-file) on the root of your project.

```sh
vtex watch --webpack <sandbox-name>
```

## Webpack Dev Server

You can also run the VTEX Toolbelt watcher in parallel with the [Webpack Dev Server](http://webpack.github.io/docs/webpack-dev-server.html) watcher if you use the `--server` option under the `watch` command.

As Webpack Dev Server uses Webpack, you also need a webpack.config.js file on the root of yout project.

```sh
vtex watch --server <sandbox-name>
```

You need to call it this way if you want to enable [Hot Module Replacement](http://webpack.github.io/docs/hot-module-replacement-with-webpack.html), see below for more information on how to configure your project and OS in order to make it work properly.

# Livereload

Add to your layout the following script:

```html
  <script src="http://localhost:35729/livereload.js?snipver=1"></script>
```

# Hot Module Replacement

In order to make the Hot Module Replacement work, besides running the `watch` command with the `--server` option, you need to:

## Edit your hosts file

The hosts file is a computer file used by an operating system to map hostnames to IP addresses. 

On Linux and Mac you can find the file on `/etc/hosts`, you need `sudo` to be able to edit this file.
On Windows you can find it on `C:\Windows\System32\Drivers\etc\hosts`, you may need administrative privileges to edit the file.

Append to the end of your file the following:

```plain
127.0.0.1      <name-of-your-store>.beta.myvtex.com
```

127.0.0.1 is your localhost. It may vary on different machines.

## Add this snippet to your Webpack entry point

```javascript
// Enable react hot loading with external React
if (module.hot) {
  window.RootInstanceProvider = require('react-hot-loader/Injection').RootInstanceProvider;
}
```

For more on that matter, see [this](https://github.com/gaearon/react-hot-loader/tree/master/docs#usage-with-external-react).

## Configure your Webpack config file

You need to add to your webpack.config.js file the options that Webpack Dev Server uses in order to work, it can be something like:

```javascript
devServer: {
    publicPath: publicPath,
    port: 3000,
    hot: true,
    inline: true,
    stats: {
        assets: false,
        colors: true,
        version: true,
        hash: false,
        timings: true,
        chunks: true,
        chunkModules: false
    },
    historyApiFallback: true,
    proxy: {
        '*': 'http://janus-edge.vtex.com.br/'
    }
}
```

For more on that, you can see [this](http://webpack.github.io/docs/webpack-dev-server.html#webpack-dev-server-cli).

That should do it! Remember to open the URL that you defined with the port configured in your webpack.config file.

Unfortunately to access the URL normally, you need to comment or delete the line added in your hosts file.

# VTEX Ignore

The VTEX Ignore it's a file that you can put on the root of your project, naming it `.vtexignore`.

This files tells `watch` which files he shouldn't send to the server.
If no `.vtexignore` is found, it fallbacks to the [.gitignore](http://git-scm.com/docs/gitignore) file.

# Publish

To publish your VTEX app to VTEX Gallery, just type `vtex publish`. The app will be published under the vendor name.

# Troubleshooting

### Cannot resolve module 'react/lib/ReactMount'

If an error of this sort occurs:

```
ERROR in ./src/components/MyComponent.jsx
Module not found: Error: Cannot resolve module 'react/lib/ReactMount' in /home/username/projects/mycomponent/src/components
 @ ./src/components/MyComponent.jsx 1:350-381
```

Add `ReactMount` to your webpack.config externals:

```js
externals: {
  'react/lib/ReactMount': 'ReactMount',
  'react': 'React'
},
```

### Multiple entry points not hot reloading

If you have multiple entry points, you should include `webpack/hot/only-dev-server` on each entry, like so:

```js
  entry: hot ? {
    '.':
      [
        'webpack-dev-server/client?http://0.0.0.0:3000',
        'webpack/hot/only-dev-server',
        './src/' + pkg.name + '.jsx'
      ],
    editor:
      [
        'webpack/hot/only-dev-server',
        './src/' + pkg.name + '-editor.jsx'
      ]
```
