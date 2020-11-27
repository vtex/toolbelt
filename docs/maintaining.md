## Maintaining VTEX Toolbelt

This document is for people working on VTEX as Toolbelt maintainers.

**Table of Contents**

- [Deploying a new version](#deploying-a-new-version)
- [Forcing a new version](#forcing-a-new-version)
- [Deprecating a version](#deprecating-a-version)
- [Changing the release message](#changing-the-release-message)
- [Monitoring and debugging user errors](#monitoring-and-debugging-user-errors)

### Deploying a new version

#### **NPM**

The main deploy of `toolbelt` is on [NPM](https://www.npmjs.com/package/vtex). This deploy is reponsable for warning `new and deprecated versions`

Here's how you deploy on `NPM`:

- Fire this command on terminal in `toolbelt` project root path (*Stable version*):

```bash
    releasy patch --stable
    releasy minor --stable
    releasy major --stable
```

- Fire this command on terminal in `toolbelt` project root path (*Beta version*):

```bash
    releasy patch
    releasy minor
    releasy major
```

This will release a `github tag` and trigger the `npm-publish github action`

#### **AWS S3**

This deploy will contain the `toolbelt standalone tarball` that is compatible with `MacOS` and `Linux`

Here's how you deploy on `NPM`: 

- Fire this command on terminal in `toolbelt` project root path

```bash
yarn release
yarn release:win
```

This [command](https://github.com/vtex/toolbelt/blob/ef67f52cd200ab08445684767c839319b86b5454/package.json#L19) will pack and publish on AWS S3.

#### **BREW**

To deploy on brew, you should change 3 lines of [Toolbelt Formula](https://github.com/vtex/homebrew-vtex).

All this values can be found [here](https://tinyurl.com/yxgcuf5a). **Just make sure that was deployed first on S3**

Here's the 3 lines of `Toolbelt Formula` repo to edit in order to deploy on `BREW`:

```ruby
  url "URL_OF_TAR_GZ_FILE"
  sha256 "SHASUM_OF_FILE"
  version "DEPLOY_VERSION"
```

### Forcing a new version

Toolbelt has a way of enforcing users to use a minimum version choosed by us. This enforcement is
done on the client side (can be disabled by an environment variable, check
[EnvVariables](../src/lib/constants/EnvVariables.ts)) and on `vtex.builder-hub` - users using an
older toolbelt version will not be allowed to link or publish. This feature is useful for enforcing
users to update to the latest version, which can benefit users in many situations, like the
following:

- Bugs on toolbelt usage were fixed, providing a better experience.
- A security bug was fixed, protecting our users from a vulnerability.
- We improved usage on a command or provided better error messages and logs.

We don't need to enforce the newest version in every release (except when a security bug was fixed),
but from time to time it's important to enforce a newer version - updating will provide an overall
better experience for our users.

Here's how you enforce minimum toolbelt version:

1. You'll have to install the [toolbelt-config-cli](https://github.com/vtex/toolbelt-config-cli):

```
yarn global add @vtex/toolbelt-config-cli
```

2. Login to `vtex` account.

```
$ vtex login vtex
```

3. Check the current version config:

```
$ toolbelt-conf config:get

All configs
{
  minimumToolbeltVersion: '2.102.1',
  minimumToolbeltPrereleaseVersion: '2.102.1'
}
```

The `minimumToolbeltPrereleaseVersion` is used for enforcing minimum `-beta` versions;
`minimumToolbeltVersion` is used for enforcing minimum stable version. You'll probably want to
maintain the property `minimumToolbeltPrereleaseVersion <= minimumToolbeltVersion`.

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
index=io_vtex_logs app=vtex.toolbelt-config-server@* data.event=CONFIG* workspace=master
```

### Deprecating a version

Toolbelt has a way of enforcing users to not use deprecated versions. From time to time toolbelt
accesses the `npm` registry to check if the current version is deprecated - if it's the user won't
be allowed to run commands and will be presented a message like the following:

```
This version 2.93.0 was deprecated. Please update to the latest version: 'yarn global add vtex'.
```

This enforcement is on the client side and can be disabled on an execution by setting an environment
variable (check [EnvVariables](../src/lib/constants/EnvVariables.ts)).

There's a problem with this approach - when we deprecate a npm package version, the `latest` tag is
not automatically relocated, we have to do it manually, so the full process of deprecating a version
is the following (the version chosen is just an example):

1. Deprecate it:

```
npm deprecate vtex@2.92.0 "Message explaining why this version was deprecated, for example: Bug when sending files to link"
```

2. Change the `latest` tag to the previous version (you'll have to check it):

```
npm dist-tag add vtex@2.91.0 latest
```

3. Make sure that we aren't enforcing the deprecated version (see
   [forcing a new version](##forcing-a-new-version))

That's it!

### Changing the release message

Release notes are updated every month. Initially we manually updated the message on toolbelt and
released a new version for every new release notes, but this flow had problems like:

- The user had to update the CLI to see the new release message.
- We had to go for the trouble of releasing a new version just for updating the release notes
  message.

Because of this the app
[vtex.toolbelt-config-server](https://github.com/vtex/toolbelt-config-server) was extended to
provide messages via a REST API. When toolbelt has to show the release notes message it does a
request to `vtex.toolbelt-config-server` and, with that, we can just update the message via the REST
API and all users will start to see the updated message. The messages provided by the
toolbelt-config-server are documented
[here](https://github.com/vtex/toolbelt-config-server#messages).

Now, here's how to update the release notes message:

1. You'll have to install the [toolbelt-config-cli](https://github.com/vtex/toolbelt-config-cli):

```
yarn global add @vtex/toolbelt-config-cli
```

2. Login to `vtex` account.

```
$ vtex login vtex
```

3. Download the current release notes message:

```
$ toolbelt-conf message:get --name releaseNotes --output file.json
releaseNotes

{
  releaseNotes: {
    type: 'box',
    boxConfig: {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
      align: 'center'
    },
    content: '{bold.green July 2020 Release Notes} are now available!\n' +
      '{{emoji.memo}} Be up-to-date with the latest news on VTEX IO now:\n' +
      '{blueBright https://bit.ly/316PVIj}'
  }
}
```

This command will download the message to the `file.json` file.

4. Modify the message on the downloaded file. For more info on features provided when rendering the
   message check the [toolbelt-message-renderer](https://github.com/vtex/toolbelt-message-renderer)
   package.

5. Preview the message:

```
$ toolbelt-conf message:preview --file file.json
releaseNotes

   ╭───────────────────────────────────────────────────────────╮
   │                                                           │
   │        July 2020 Release Notes are now available!         │
   │   📝 Be up-to-date with the latest news on VTEX IO now:   │
   │                  https://bit.ly/316PVIj                   │
   │                                                           │
   ╰───────────────────────────────────────────────────────────╯

```

6. When the editing and previewing cycle is done you can update the message on remote:

```
$ toolbelt-conf message:set --file file.json
```

That's it, now you can check on splunk the latest message changes (all changes are logged):

```
index=io_vtex_logs app=vtex.toolbelt-config-server@* data.event=MESSAGE* workspace=master
```

### Monitoring and debugging user errors

Toolbelt has a telemetry system that sends anonymous usage reports, runtime metrics and error
information to the `toolbelt-telemetry` app, which logs the information to Splunk. These metrics are
available to be visualized on
[this Splunk dashboard](https://splunk72.vtex.com/en-US/app/vtex_io_apps/toolbelt_telemetry?form.field1.earliest=-60m%40m&form.field1.latest=now&form.TIME.earliest=-15m&form.TIME.latest=now&form.DASHBOARD_TIME.earliest=-4h%40m&form.DASHBOARD_TIME.latest=now&form.time1.earliest=-4h%40m&form.time1.latest=now&form.time.earliest=-60m%40m&form.time.latest=now).

All error reports are associated with an ErrorID - when an error happens this ErrorID is shown to
the user and we can use this to pinpoint the error on Splunk and check details on it:

```
index=io_vtex_logs app=vtex.toolbelt-telemetry* $ErrorID
```
