# Breaking toolbelt commands into plugins

Remove all the commands, transform them into plugins and set only the necessary ones as default when you install the VTEX CLI.

## Motivation

VTEX CLI is the first contact that we have with the VTEX IO products, so we need to have a clean and simple CLI that works pretty well.

Nowadays we have a CLI that, by default, comes with a **LOT** of commands that probably most of them will never be used by the same user.

![](https://i.imgur.com/2GIq2Ep.png)

The idea is to remove commands that are not necessary to be included on toolbelt by default, e.g., `vtex lighthouse` and `vtex test`. If the user eventually needs to use some of these extra commands, he/she can just add the desired command to its local CLI.

In order to provide discoverability of possible commands the user can import a library can be created with all commands approved by VTEX (inspired in  [Adobe I/O CLI](https://github.com/adobe/aio-cli)), this way the users will have a curated list of safe commands to install locally.

![](https://i.imgur.com/TXS0MmO.png)

With this, the user will have a better experience with a new and clean CLI.

## Explanation

This new change will be made by `plugins`, breaking all the commands and transform them into plugins, now we are going to add only necessary `plugins` as default. Some documentation about plugins was made by a study and is registered [here](https://github.com/VerasThiago/CLIBenchmark/blob/master/Oclif/docs/ABOUTME.md).

## Internal details

### Toolbelt Plugins

Toolbelt commands share a lot of common code, which is a situation that will happen too when the commands are broken into plugins. Because of this we have to create a way to share this common code across plugins, but first we have to determine what we want to share across them:

- `SessionManager`
- `Clients + IOClientFactory + SSE Helpers`
- `ErrorReport`
- `MetricReport`
- `Plugin-namespaced ErrorKinds`
- `Plugin-namespaced MetricReports`
- `Plugin-namespaced user-agent?`
- `Constants (?) - EnvVariables, Headers, Paths (?)`
- `Namespaced Paths (?)` (create a plugins/plugin-name folder to place the folders the plugin want to use)
- `Manifest reading/editing helpers` (ManifestEditor class, which ideally should be renamed to Manifest)
- `PackageJson reading/editing helper`

#### Approach #1
Create a `@vtex/toolbelt-api` with all these needs. The plugins would always use this package and the toolbelt core would use this package as well.

##### Problem #1

How do we guarantee that all installed plugins are using the same `@vtex/toolbelt-api` version? The problem on them using different versions is the amount of code to be compiled when requiring and the fact that we could have fixed a major bug in a `@vtex/toolbelt-api`'s patch. 

![](https://i.imgur.com/WTBuh0Y.png)

You can check a POC that I made [here](https://github.com/VerasThiago/npmPackageTests).


##### Solution #1

Enforce that the plugin is using the caret "`^`" in his `@vtex/toolbelt-api` version.

Example:
```
"dependencies": {
    "@vtex/toolbelt-api": "^1.0.10",
},
```

##### Solution #2

Use [Peer Dependencies](https://nodejs.org/es/blog/npm/peer-dependencies/)

Example:

"peerDependencies": {
  "@thiagoveras/toolbelt-api-test": "^1.1.1"
}

Solution with default plugins [here](https://github.com/VerasThiago/npmPackageTests/pull/1).

Problem with external plugins [here](https://github.com/VerasThiago/npmPackageTests/pull/1#issuecomment-647696211)


#### Approach #2 (**Chosen**)

Reorganize toolbelt `/src`, to store the code that will be shared inside a folder `toolbelt-api` for example.

Plugins now import from `toolbelt` the code that they will use. Currently toolbelt doesn't allow this easily because it doesn't offer re-export entrypoints and doesn't have on the published bundle the typescript types.

To solve this problem is quite simple, just need to add the `declaration: true` option inside `tsconfig` and now the user can do:

```
import { SessionManager } from ‘vtex’
```

Or

```
Import { SessionManager } from ‘vtex/toolbelt-api’
Import { Apps } from ‘vtex/toolbelt-clients’
```

To implement this solution, we can just simply create an entrypoint `index.ts` that re-export everything that `toolbelt` want from plugin to have access.

#### Problem 1

Using this approach can have problems with initialization performance. We can use as example `@vtex/api`, nowadays in `toolbelt` have a not negligible cost of initialization.

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `node simple-require.js` | 705.3 ± 31.2 | 662.0 | 818.0 | 1.69 ± 0.09 |
| `node require-file.js` | 416.7 ± 13.6 | 389.3 | 450.4 | 1.00 |
| `node destructure-require.js` | 696.5 ± 15.1 | 667.9 | 740.5 | 1.67 ± 0.07 |

Check the full benchmark [here](https://github.com/tiagonapoli/benchmarking/tree/master/node-vtex-api-import
)


Because of this, I made a benchmark to analyze if this cost will be really bad for the `toolbelt` performance, and the results was pretty good as far as I understand.

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `node axios-require.js` | 43.9 ± 3.4 | 37.8 | 51.4 | 1.00 |
| `node vtex-api-require.js` | 519.9 ± 24.6 | 482.4 | 607.7 | 11.83 ± 1.08 |
| `node simple-require.js` | 577.1 ± 11.3 | 552.7 | 595.9 | 13.13 ± 1.06 |
| `node destructure-require.js` | 580.9 ± 10.1 | 562.6 | 598.4 | 13.22 ± 1.06 |



Check the full benchmark [here](https://github.com/VerasThiago/toolbelt-benchmark/tree/master/toolbelt-import)

## Future possibilities

### How to easily develop a plugin?
- We should create a Template Repository solving this issue.
