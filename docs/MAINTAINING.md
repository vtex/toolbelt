## Maintaining VTEX Toolbelt

This document is for people working on VTEX as Toolbelt maintainers.

### Forcing a new version

Toolbelt has a way of enforcing users to use a minimum version choosed by us. This enforcement is done on the client side (can be disabled by an environment variable, check [EnvVariables](../src/lib/constants/EnvVariables.ts)) and on `vtex.builder-hub` - users using an older toolbelt version will not be allowed to link or publish. This feature is useful for enforcing users to update to the latest version, which can be important when we launch a new version with a major bug fix for example. This enforcement may benefit users in situations like the following:

- Bugs on toolbelt usage were fixed, providing a better experience.
- A security bug was fixed, protecting our users from a vulnerability.
- We improved usage on a command or provided better error messages and logs.

Because of these from time to time it's important to enforce a newer version - updating will provide an overall better experience for our users.

Here's how you enforce minimum toolbelt version:

1. You'll have to install the [toolbelt-config-cli](https://github.com/vtex/toolbelt-config-cli):

```
yarn global add @vtex/toolbelt-config-cli
```

2. Login to `vtex` account.
3. Check the current version config:

```
$ toolbelt-conf config:get

All configs
{
  minimumToolbeltVersion: '2.102.1',
  minimumToolbeltPrereleaseVersion: '2.102.1'
}
```

The `minimumToolbeltPrereleaseVersion` is used for enforcing minimum `-beta` versions; `minimumToolbeltVersion` is used for enforcing minimum stable version. You'll probably want to maintain the property `minimumToolbeltPrereleaseVersion <= minimumToolbeltVersion`.

4. Set the version to the one you want to enforce.

If you want to change `minimumToolbeltVersion`:

```
$ toolbelt-conf config-set -n minimumToolbeltVersion -v 2.92.0
```

If you want to change `minimumToolbeltPrereleaseVersion`:

```
$ toolbelt-conf config-set -n minimumToolbeltPrereleaseVersion -v 2.92.0
```

That's it, now you can check on splunk the latest config changes (all changes are logged):

```
index=io_vtex_logs app=vtex.toolbelt-config-server@* data.event!=NULL workspace=master
```

### Deprecating a version

Toolbelt has a way of enforcing users to not use deprecated versions. From time to time toolbelt accesses the `npm` registry to check if the current version is deprecated - if it's the user won't be allowed to run commands and will be presented a message like the following:

```
This version 2.93.0 was deprecated. Please update to the latest version: 'yarn global add vtex'.
```

This enforcement is on the client side and can be disabled on an execution by setting an environment variable (check [EnvVariables](../src/lib/constants/EnvVariables.ts)).

There's a problem with this approach - when we deprecate a npm package version, the `latest` tag is not automatically relocated, we have to do it manually, so the full process of deprecating a version is the following (the version chosen is just an example):

1. Deprecate it:
```
npm deprecate vtex@2.92.0 "Message explaining why this version was deprecated, for example: Bug when sending files to link"
```

2. Change the `latest` tag to the previous version (you'll have to check it):
```
npm dist-tag add vtex@2.91.0 latest
```

3. Make sure that we aren't enforcing the deprecated version (see [forcing a new version](##forcing-a-new-version))

That's it!
