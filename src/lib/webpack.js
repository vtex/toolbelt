import webpack from 'webpack';
import express from 'express';
import httpProxy from 'http-proxy';

class WebpackRunner {
  constructor() {
    try {
      this.config = require(process.cwd() + '/webpack.config.js');
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        let pkgName = err.toString().match(/'(.*)'/)[1];
        if (pkgName.indexOf('webpack.config.js') !== -1) {
          console.log('webpack.config.js not found'.bold.yellow);
        } else {
          console.log(err.toString().bold.red);
          console.log('Did you installed ' + pkgName.yellow + '?');
        }
      } else {
        console.error('Error while trying to read ' + process.cwd() + '/webpack.config.js');
        console.error(err);
      }

      process.exit(1);
    }

    this.compiler = webpack(this.config);
    this.DELAY_TIME = 2000;
  }

  startDevServer = () => {
    let port = 3000;

    setTimeout(() => {
      let proxy = new httpProxy.createProxyServer();
      let app = express();

      app.use(require('webpack-dev-middleware')(this.compiler, {
        noInfo: true,
        publicPath: this.config.output.publicPath
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

      app
        .listen(port, 'localhost', (err) => {
          if (err) return console.log(err);
          console.log('Listening at http://localhost:' + port);
        })
        .on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(('Server port ' + port + ' already in use').red);
            console.log('(maybe another `vtex watch -s` is running?)'.yellow);
            return process.exit(1);
          } else if (err) {
            console.log('Error while trying to start a server');
            return console.log(err);
          }
        });
    }, this.DELAY_TIME);
  }

  startWebpack = () => {
    setTimeout(() => {
      this.compiler.watch({}, (err, stats) => {
        if (err) return console.error(err.stack || err);

        let outputOptions = {
          cached: false,
          cachedAssets: false,
          colors: require('supports-color'),
          exclude: ['node_modules', 'bower_components', 'jam', 'components']
        };

        console.log(stats.toString(outputOptions) + '\n');
      });
    }, this.DELAY_TIME);
  }
}

export default WebpackRunner;
