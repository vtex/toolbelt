#!/usr/bin/env bash

set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
TARGETS=$(node -p "require('./package.json').oclif.update.node.targets.join(',')")
ARCHIVE="dist/vtex-v${VERSION}/vtex-v${VERSION}-darwin-arm64.tar.gz"

case ",${TARGETS}," in
    *,darwin-arm64,*) ;;
    *)
        echo "darwin-arm64 is missing from the default standalone targets" >&2
        exit 1
        ;;
esac

case ",${TARGETS}," in
    *,darwin-x64,*)
        echo "darwin-x64 must not be published: macOS standalone releases are Apple Silicon only" >&2
        exit 1
        ;;
esac

if [ ! -f "$ARCHIVE" ]; then
    echo "Apple Silicon archive not found: $ARCHIVE" >&2
    exit 1
fi

VERIFY_DIR=$(mktemp -d "${TMPDIR:-/tmp}/vtex-darwin-arm64.XXXXXX")
trap 'rm -rf -- "$VERIFY_DIR"' EXIT

tar -xzf "$ARCHIVE" -C "$VERIFY_DIR" vtex/bin/node
NODE_BINARY="$VERIFY_DIR/vtex/bin/node"
NODE_FILE_INFO=$(file "$NODE_BINARY")

case "$NODE_FILE_INFO" in
    *Mach-O*arm64*) ;;
    *)
        echo "Expected an arm64 Mach-O Node.js binary, got: $NODE_FILE_INFO" >&2
        exit 1
        ;;
esac

if [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ]; then
    RUNTIME_ARCH=$("$NODE_BINARY" -p "process.arch")
    if [ "$RUNTIME_ARCH" != "arm64" ]; then
        echo "Expected the packaged Node.js runtime to report arm64, got: $RUNTIME_ARCH" >&2
        exit 1
    fi
fi

echo "Verified native Apple Silicon runtime: $NODE_FILE_INFO"
