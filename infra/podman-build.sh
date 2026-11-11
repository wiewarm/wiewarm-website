#!/bin/bash

set -euo pipefail
REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$REPO_DIR"
image_tag="${1:-latest}"

podman build --security-opt seccomp=unconfined -f infra/Dockerfile.apache-php -t "wiewarm-apache:$image_tag" infra
podman build -f infra/Dockerfile.node -t "wiewarm-node:$image_tag" .
