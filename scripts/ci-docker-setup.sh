#!/usr/bin/env bash

set -euo pipefail

echo '{ "features": { "containerd-snapshotter": true } }' | sudo tee /etc/docker/daemon.json > /dev/null

sudo systemctl restart docker
docker info -f '{{ .DriverStatus }}'
