#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

./generate-mounts.sh >/dev/null

if [ "$(uname -s)" = "Darwin" ]; then
  export DOCKER_HOST="unix://${HOME}/.colima/tabseet-flex/docker.sock"
fi

docker compose -f docker-compose.yml -f docker-compose.mounts.generated.yml down

# Frees the VM's RAM/CPU until you run start.sh again (macOS only - Linux
# has no VM to stop).
if [ "$(uname -s)" = "Darwin" ]; then
  colima stop --profile tabseet-flex
fi
