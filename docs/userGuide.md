## User Guide of VTEX Toolbelt

This document is for people who use Toolbelt.

**Table of Contents**

- [Download](#donwload)
- [Uninstall](#uninstall)
- [Update / Deprecate / Outdate](#update-deprecate-outdate)
- [Troubleshoot](#troubleshoot)

### **Download**

This section contains the `download` method in order of priority to each OS.

#### MacOS

- Brew
    ```bash
    brew tap vtex/vtex
    brew install vtex
    ```

### Linux

- Standalone 
    
    The standalone install is a simple tarball with a binary. It contains its own node.js binary.

    ```bash
    curl https://vtex-toolbelt-test.s3.us-east-2.amazonaws.com/install.sh | sh
    ```

### Windows (WIP)

- Chocolatey

    ```bash
    choco install vtex
    ```

### Other method

- NPM

    The CLI is built with Node.js and is installable via `npm`. This is a manual install method that can be used in environments where autoupdating is not ideal or where Toolbelt does not offer a prebuilt Node.js binary.

    **It’s strongly recommended to use one of the other installation methods if possible.**

    If you use any of the other installation methods the proper version of Node.js is already included, and it doesn’t conflict with any other version on your system.

    ```bash
    yarn global add vtex
    ```

### **Uninstall**

#### MacOS

- Brew
    ```bash
    brew uninstall vtex
    ```

### Linux

- Standalone 
    
    ```bash
    curl https://vtex-toolbelt-test.s3.us-east-2.amazonaws.com/uninstall.sh | sh
    ```

### Windows (WIP)

- Chocolatey

    ```bash
    choco uninstall vtex
    ```

### Other Method

- NPM

     ```bash
    yarn global remove vtex
    ```

### **Update / Deprecate / Outdate**

This section refers how to handle when you need to `update`  `Toolbelt` or when it's `outdated` / `deprecated`.

#### MacOS

- Brew
    - Update

    ```bash
    brew upgrade vtex
    ```

    - Deprecate

    ```bash
    brew unlink vtex
    brew install vtex/vtex
    ```

### Linux

- Standalone 
    
    - Update

    ```bash
    vtex autoupdate
    ```

    - Deprecate

    ```bash
    curl https://vtex-toolbelt-test.s3.us-east-2.amazonaws.com/uninstall.sh | sh

    curl https://vtex-toolbelt-test.s3.us-east-2.amazonaws.com/install.sh | sh
    ```

### Windows (WIP)

- Chocolatey

    ```bash
    choco uninstall vtex
    choco install vtex
    ```

### Other Method

- NPM

     ```bash
    yarn global add vtex
    ```

### Troubleshoot

- `Error: Cannot find module 'vtex'`
    
    This error ir related to `commands` that are `plugins`. This `plugins` are decoupled from `Tooolbelt` base code but still need some functions of it, in order that, a `require 'vtex' ` is made.

    When the `plugin` is installed inside `toolbelt` this `require` will look up for the `vtex package` inside `/node_modules/vtex`, but this package don't exist, since he will use his *own* functions.

    To solve this problem, you will need to create a `symlink` from `VTEX_FOLDER/node_modules/vtex` to `VTEX_FOLDER/`

    Example:

    *Windows*

    - Chocolatey
    
    ```bash
    New-Item -ItemType SymbolicLink -Path 'C:\Program Files\vtex\client\node_modules\vtex' -Target 'C:\Program Files\vtex\client'    
    ```

    *Linux*

    - Standalone

    ```bash
    ln -s /usr/local/lib/vtex /usr/local/lib/vtex/node_modules/vtex
    ```

    *MacOS*

    - Brew

    ```bash
    ln -s /usr/local/Cellar/vtex/2.119.2/libexec /usr/local/Cellar/vtex/2.119.2/libexec/node_modules/vtex
    ```