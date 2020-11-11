**Table of contents**

- [How to use Toolbelt Config Server](#how-to-use-Toolbelt-Config-Server)
- [How to use TSC inside Toolbelt](#how-to-use-tsc-inside-toolbelt) 


## How to use Toolbelt Config Server

### Get All configs
This is a *public* route that retrieves all toolbelt remote configs

- `GET https://master--vtex.myvtex.com/_v/public/toolbelt/global-config`
  
- ![](https://i.imgur.com/EgcqUcX.png)

### Get Feature Flag

This is a *private* route (need `vtex local token`) that retrieves the feature flag data, in case of empty feature flag name, return all of the.

- `GET https://app.io.vtex.com/vtex.toolbelt-config-server/v0/vtex/master/_v/private/toolbelt/featureFlag/:featureFlagName`

- With Flag Name
![](https://i.imgur.com/PRdkdRZ.png)

- Without Flag Name
![](https://i.imgur.com/GnfJ3Ic.png)

### Create Feature Flag

This is a *private* route (need `vtex local token`) that create a feature flag.

- `POST https://app.io.vtex.com/vtex.toolbelt-config-server/v0/vtex/master/_v/private/toolbelt/featureFlag/`
- Body: 
  ```
  {
    "featureFlagName": "FEATURE_FLAG_NAME",
    "featureFlagData": {
      "String": any,
      "String": any
    }
  }
  ```
- ![](https://i.imgur.com/JWyIzJR.png)

### Update Feature Flag

This is a *private* route (need `vtex local token`) that update a feature flag.

- `PUT https://app.io.vtex.com/vtex.toolbelt-config-server/v0/vtex/veras/_v/private/toolbelt/featureFlag/FEATURE_FLAG_NAME`
- Body: 
  ```
  {
    "featureFlagData": {
      "String": any,
      "String": any
    }
  }
  ```
- ![](https://i.imgur.com/KPXpxEi.png)

### Delete Feature Flag

This is a *private* route (need `vtex local token`) that delete a feature flag.

- `DELETE https://app.io.vtex.com/vtex.toolbelt-config-server/v0/vtex/master/_v/private/toolbelt/featureFlag/FEATURE_FLAG_NAME`
- ![](https://i.imgur.com/HuMUbX0.png)

## How to use TSC inside Toolbelt

Today it's only possible to access all feature flags inside `toolbelt`, all other commands (Update, Create, Delete) should be used by HTTP requests externally.

- Get all feature flags:

```javascript
const featureFlags: Record<string, any> = FeatureFlag.getSingleton().getFeatureFlagInfo()
```

- Example of usage:

  - First create the function inside `featureFlagDecider.ts`
  - Import where it need to be used


  ```javascript
  // featureFlagDecider.ts
  export async function switchWhoami() {
    try {
      const featureFlags: Record<string, any> = FeatureFlag.getSingleton().getFeatureFlagInfo()

      if (featureFlags.FEATURE_FLAG_WHOAMI_PLUGIN.VTEX){
        return newAuthWhoami()
      } else {
        return oldAuthWhoami()
      }
    } catch (err) {
      ErrorReport.createAndMaybeRegisterOnTelemetry({
        kind: ErrorKinds.TOOLBELT_CONFIG_FEATURE_FLAG_ERROR,
        originalError: err,
      }).logErrorForUser({ coreLogLevelDefault: 'debug' })
    }
  }
  ```

  ```javascript
  // main.ts
  import { switchWhoami } from './featureFlagDecider'

  async run() {
    this.parse(WhoAmI)

    await switchWhoami()
  }
  ```