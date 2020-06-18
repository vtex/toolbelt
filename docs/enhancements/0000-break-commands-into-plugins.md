# Breaking toolbelt commands into plugins

Remove all the commands, transform them into plugins and set only the necessary ones as default when you install the VTEX CLI.

## Motivation

VTEX CLI is the first contact that we have with the VTEX IO products, so we need to have a clean and simple CLI that works pretty well.

Nowadays we have a CLI that, by default, comes with a **LOT** of commands that probably most of them will never be used.

![](https://i.imgur.com/2GIq2Ep.png)

The idea is to remove this commands that are not necessary to come by default, i.e., `vtex lighthouse` and `vtex test`. Eventually the user will need to use some of this extra commands so just import to his own CLI.

We can also have a library with all the possible commands that the user can import such as [Adobe I/O CLI](https://github.com/adobe/aio-cli).

![](https://i.imgur.com/TXS0MmO.png)

With this, the user will have a better experience with a new and clean CLI.

## Explanation

This new change will be made by `plugins`, breaking all the commands and transform them into plugins, now we are going to add only necessary `plugins` as default. Some documentation about plugins was made by a study and is registered [here](https://github.com/VerasThiago/CLIBenchmark/blob/master/Oclif/docs/ABOUTME.md).

## Internal details

### Toolbelt Plugins

Huge amount of toolbelt commands share the same piece of code, in order that, toolbelt plugins will need to use it as well. So what do toolbelt-plugins will need?

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

How do we guarantee that all installed plugins are using the same `@vtex/toolbelt-api version`? The problem on them using different versions is the amount of code to be compiled when requiring and the fact that we could have fixed a major bug in a `@vtex/toolbelt-api`'s patch. 

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

I'm still developing this solution for the previous [POC](https://github.com/VerasThiago/npmPackageTests)

## Future possibilities

### How to easily develop a plugin?
- We should create a Template Repository solving this issue.
