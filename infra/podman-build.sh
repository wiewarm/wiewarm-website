#!/bin/bash

set -e
set -u
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR

podman build --security-opt seccomp=unconfined  -f Dockerfile.apache-php -t wiewarm-apache:latest
