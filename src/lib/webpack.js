import webpack from 'webpack';
import express from 'express';
import httpProxy from 'http-proxy';
import chalk from 'chalk';

class WebpackRunner {
  constructor(vendor, credentials) {
    try {
      this.config = require(process.cwd() + '/webpack.config.js');
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        let pkgName = err.toString().match(/'(.*)'/)[1];
        if (pkgName.indexOf('webpack.config.js') !== -1) {
          console.log(chalk.bold.yellow('webpack.config.js not found'));
        } else {
          console.log(chalk.bold.red(err.toString()));
          console.log('Did you install ' + chalk.yellow(pkgName) + '?');
        }
      } else {
        console.error('Error while trying to read ' + process.cwd() + '/webpack.config.js');
        console.error(err);
      }

      process.exit(1);
    }

    const sandboxPublicPath =
      this.config.output.publicPath.replace(`/${vendor}/`, `/${vendor}~${credentials.email}/`);
    this.config.output.publicPath = sandboxPublicPath;
    this.compiler = webpack(this.config);
    this.watcher;
    this.server;
  }

  startDevServer = () => {
    let port = 3000;
    let proxy = new httpProxy.createProxyServer();
    let app = express();

    app.use(require('webpack-dev-middleware')(this.compiler, {
      noInfo: true,
      publicPath: this.config.output.publicPath,
      stats: { colors: true }
    }));

    app.use(require('webpack-hot-middleware')(this.compiler));

    if (this.config.proxy) {
      if (!Array.isArray(this.config.proxy)) {
        this.config.proxy = Object.keys(this.config.proxy).map((path) => {
          let proxyOptions;
          if (typeof this.config.proxy[path] === 'string') {
            proxyOptions = {
              path: path,
              target: this.config.proxy[path]
            };
          } else {
            proxyOptions = this.config.proxy[path];
            proxyOptions.path = path;
          }

          return proxyOptions;
        });
      }

      this.config.proxy.forEach((proxyOptions) => {
        app.all(proxyOptions.path, (req, res) => {
          req.headers['x-vtex-forwarded-port'] = 3000;

          if (typeof proxyOptions.rewrite === 'function') {
            proxyOptions.rewrite(req, proxyOptions);
          }

          if (proxyOptions.host) {
            req.headers.host = proxyOptions.host;
          }

          proxy.web(req, res, proxyOptions, function() {
            res.statusCode = 502;
            return res.end();
          });

          if (proxyOptions.configure) {
            return proxyOptions.configure(proxy);
          }
        });
      });
    }

    this.server = app
      .listen(port, 'localhost', (err) => {
        if (err) return console.log(err);
        console.log(`\nListening at http://localhost:${port}`);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(chalk.red(`Server port ${port} already in use`));
          console.log(chalk.yellow('(maybe another `vtex watch -s` is running?)'));
          return process.exit(1);
        } else if (err) {
          console.log('Error while trying to start a server');
          return console.log(err);
        }
      });
  }

  startWebpack = () => {
    this.watcher = this.compiler.watch({}, (err, stats) => {
      if (err) return console.error(err.stack || err);

      let outputOptions = {
        cached: false,
        cachedAssets: false,
        colors: require('supports-color'),
        exclude: ['node_modules', 'bower_components', 'jam', 'components']
      };

      console.log(stats.toString(outputOptions) + '\n');
    });
  }

  close = () => {
    if (this.server) {
      this.server.close();
    } else if (this.watcher) {
      this.watcher.close();
    } else {
      return Error('No instance of webpack is running');
    }
  }
}

export default WebpackRunner;
