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

> If you need help with the structure of your project or you just don't want to spend the time with this tinkering, you can use our [generator](https://github.com/vtex/generator-vtex)!

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

## Dev Server

You can also run the VTEX Toolbelt watcher in parallel with the Dev Server watcher if you use the `--server` option under the `watch` command.

As Dev Server uses Webpack, you also need a webpack.config.js file on the root of yout project.

```sh
vtex watch --server <sandbox-name>
```

You need to call it this way if you want to enable [Hot Module Replacement](http://webpack.github.io/docs/hot-module-replacement-with-webpack.html), see below for more information on how to configure your project for this.


# Livereload

Add to your layout the following script:

```html
<script src="http://localhost:35729/livereload.js?snipver=1"></script>
```

# Hot Module Replacement

First things first, you need to use [babel](https://babeljs.io/). Then, there's a few packages you need to install:

- [babel-plugin-react-transform](https://github.com/gaearon/babel-plugin-react-transform)
- [react-transform-hmr](https://github.com/gaearon/react-transform-hmr)
- [react-transform-catch-errors](https://github.com/gaearon/react-transform-catch-errors) (actually, this one is opcional)

You can install them using `npm i <package-name> --save-dev` on the root folder of your project (the `--save-dev` adds that package to the `devDependencies` of your `package.json`).

After that, create a `.babelrc` file on the root folder of your project with the following:

```json
{
  "stage": 0,
  "env": {
    "development": {
      "plugins": ["react-transform"],
      "extra": {
        "react-transform": {
          "transforms": [{
            "transform": "react-transform-hmr",
            "imports": ["react"],
            "locals": ["module"]
          }, {
            "transform": "react-transform-catch-errors",
            "imports": ["react", "redbox-react"]
          }]
        }
      }
    }
  }
}
```

Presto! Everything is configured and ready to use. Remember to use the following URL while running `vtex watch -s <sandbox-name>`:

`<store-name>.local.myvtex.com:3000`


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


## License

MIT