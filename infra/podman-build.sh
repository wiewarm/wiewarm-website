#!/bin/bash

set -euo pipefail
REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$REPO_DIR"
image_tag="${1:-latest}"
pull_args=()
case "${WIEWARM_PULL_BASE_IMAGES:-0}" in
  0) ;;
  1) pull_args+=(--pull-always) ;;
  *) echo 'WIEWARM_PULL_BASE_IMAGES must be 0 or 1.' >&2; exit 1 ;;
esac

podman build "${pull_args[@]}" --security-opt seccomp=unconfined -f infra/Dockerfile.apache-php -t "wiewarm-apache:$image_tag" infra
podman build "${pull_args[@]}" -f infra/Dockerfile.node -t "wiewarm-node:$image_tag" .
