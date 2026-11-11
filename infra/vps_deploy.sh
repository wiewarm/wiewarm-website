#!/bin/bash
set -euo pipefail
cd "${HOME}/wiewarm-website"
if ! test -r "$HOME/.wiewarm-node.env"; then
  echo 'Create ~/.wiewarm-node.env with SESSION_SECRET and WIEWARM_ORIGIN before deploying (see README.md).' >&2
  exit 1
fi
source "$HOME/.env.sh"
: "${ENV_APACHE_PORT:?Set ENV_APACHE_PORT in ~/.env.sh}"
ENV_NODE_PORT="${ENV_NODE_PORT:-$((ENV_APACHE_PORT + 10))}"
git pull --ff-only
revision=$(git rev-parse --short HEAD)
if podman image exists wiewarm-apache:latest; then
  podman tag wiewarm-apache:latest wiewarm-apache:previous
fi
./infra/podman-build.sh "$revision"
podman tag "wiewarm-apache:$revision" wiewarm-apache:latest
mkdir -p "$HOME/.config/systemd/user"
# The previous image reference and Git revision are needed for rollback.
if test -f "$HOME/.config/wiewarm-node-image"; then
  cp "$HOME/.config/wiewarm-node-image" "$HOME/.config/wiewarm-node-image.previous"
fi
printf 'WIEWARM_NODE_IMAGE=wiewarm-node:%s\n' "$revision" > "$HOME/.config/wiewarm-node-image"
cp infra/wiewarm-node.service infra/wiewarm-apache.service "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user restart wiewarm-node.service
curl --fail --retry 15 --retry-connrefused --retry-delay 2 "http://127.0.0.1:$ENV_NODE_PORT/healthz"
podman run --rm -e "APACHE_PORT=$ENV_APACHE_PORT" -e APACHE_BIND=127.0.0.1 -e "FRONTEND_ORIGIN=http://127.0.0.1:$ENV_NODE_PORT" \
  -v "$PWD/infra/apache2.conf:/etc/apache2/apache2.conf:ro,Z" wiewarm-apache:latest apache2ctl -t
systemctl --user restart wiewarm-apache.service
curl --fail --retry 15 --retry-connrefused --retry-delay 2 "http://127.0.0.1:$ENV_APACHE_PORT/healthz"
curl --fail "http://127.0.0.1:$ENV_APACHE_PORT/api/v1/temperature/all_current.json/0" > /dev/null
systemctl --user --no-pager status wiewarm-node.service wiewarm-apache.service
