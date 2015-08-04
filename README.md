# VTEX Toolbelt

CLI tool for developing VTEX apps.

# Install

First, install node and npm ([Linux](https://gist.github.com/isaacs/579814), [Mac and Windows](https://nodejs.org/download/)).

Then install VTEX Toolbelt globally:
```sh
npm install -g vtex
```
# Livereload

Add to your layout the script:

```sh
  <script src="http://localhost:35729/livereload.js?snipver=1"></script>
```

# Developing an app

To develop an app locally, open the directory where your VTEX app is then type:

```sh
vtex watch <sandbox-name>
```

You are free to set any name you want in the `sandbox-name` parameter.

VTEX Toolbelt will upload all your app files to the sandbox specified and will be watching for any changes you make to them.

## Requirements

For this to work make sure this requirements are filled:

1. Your app must have a proper `meta.json` ([read more](https://github.com/vtex/portal-wiki/wiki/meta.json-file))
2. Your app need to be installed on your store OR set on your store dependencies on the `meta.json` file
2. You must properly set `vtex_sandbox` cookie ([read more](https://github.com/vtex/portal-wiki/wiki/Sandbox))

# Publishing an app

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
