#!/bin/bash

set -e
set -u
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd ~/wiewarm-website
git pull --ff
./infra/podman-build.sh
cp infra/wiewarm-apache.service  ~/.config/systemd/user/wiewarm-apache.service
systemctl --user daemon-reload
sleep 2
systemctl --user restart wiewarm-apache.service
sleep 3
systemctl --user  --no-pager status wiewarm-apache.service

# should also copy the crontab here but that would need sudo for this account
# cp infra/${USER}_import_export.cron /etc/cron.d/${USER}_import_export
