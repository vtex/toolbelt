#!/bin/bash
{
    set -e
    SUDO=''
    if [ "$(id -u)" != "0" ]; then
      SUDO='sudo'
      echo "This script requires superuser access."
      echo "You will be prompted for your password by sudo."
      # clear any previous sudo permission
      sudo -k
    fi


    # run inside sudo
    $SUDO bash <<SCRIPT
    set -e

    echoerr() { echo "\$@" 1>&2; }

    if [[ ! ":\$PATH:" == *":/usr/local/bin:"* ]]; then
        echoerr "Your path is missing /usr/local/bin, you need to add this to use this installer."
        exit 1
    fi

    if [ "\$(uname)" == "Darwin" ]; then
        OS=darwin
    elif [ "\$(expr substr \$(uname -s) 1 5)" == "Linux" ]; then
        OS=linux
    else
        echoerr "This installer is only supported on Linux and MacOS"
        exit 1
    fi

    MACHINE="\$(uname -m)"

    # uname reports x86_64 when the shell itself is running under Rosetta.
    # Detect the physical Apple Silicon host so we always install the native CLI.
    if [ "\$OS" == "darwin" ] && [ "\$(sysctl -in sysctl.proc_translated 2>/dev/null || true)" == "1" ]; then
        MACHINE=arm64
    fi

    case "\$MACHINE" in
        arm64|aarch64)
            ARCH=arm64
            ;;
        x86_64)
            if [ "\$OS" == "darwin" ]; then
                echoerr "Intel macOS is not supported by the standalone VTEX CLI."
                exit 1
            fi
            ARCH=x64
            ;;
        armv6l|armv7l)
            ARCH=arm
            ;;
        *)
            echoerr "unsupported arch: \$MACHINE"
            exit 1
            ;;
    esac
        
    TAR_ARGS="xz"
    versionUrl=https://vtex-toolbelt-test.s3.us-east-2.amazonaws.com/\$OS-\$ARCH

    echo "Downloading latest version from \$versionUrl"
    URL=\$(curl -sk \$versionUrl | jq --raw-output '.gz')

    mkdir -p /usr/local/lib
    cd /usr/local/lib

    rm -rf vtex
    rm -rf ~/.vtex
    rm -rf ~/.local/share/vtex/client

    echo "Installing VTEX from \$URL"

    if [ \$(command -v curl) ]; then
        curl "\$URL" | tar "\$TAR_ARGS"
    else
        wget -O- "\$URL" | tar "\$TAR_ARGS"
    fi
    
    # delete old toolbelt bin if exists
    rm -f \$(command -v vtex) || true
    rm -f /usr/local/bin/vtex

    # Solve vtex plugin import of vtex
    ln -s /usr/local/lib/vtex /usr/local/lib/vtex/node_modules/vtex
    
    ln -s /usr/local/lib/vtex/bin/vtex /usr/local/bin/vtex

    # on alpine (and maybe others) the basic node binary does not work
    # remove our node binary and fall back to whatever node is on the PATH
    /usr/local/lib/vtex/bin/node -v || rm /usr/local/lib/vtex/bin/node

SCRIPT
  # test the CLI
  LOCATION=$(command -v vtex)
  echo "vtex installed to $LOCATION"
  vtex -v
}
