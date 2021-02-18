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
        choerr "You don't have /usr/local/bin path. VTEX CLI is not installed"
        exit 1
    fi

    echo "Uninstalling VTEX CLI"

    echo "removing /usr/local/bin/vtex ..."
    rm -rf /usr/local/bin/vtex
    echo "removing command -v vtex ..."
    rm -f \$(command -v vtex) || true
    echo "removing ~/.local/share/vtex ..."
    rm -rf ~/.local/share/vtex
    echo "removing /usr/local/lib/vtex ..."
    rm -rf /usr/local/lib/vtex
    echo "removing ~/.vtex ..."
    rm -rf ~/.vtex
    
SCRIPT
    echo "VTEX CLI Uninstalled"
}