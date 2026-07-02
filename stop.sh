#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ "$(uname -s)" = "Darwin" ]; then
  export DOCKER_HOST="unix://${HOME}/.colima/tabseet-flex/docker.sock"
fi

# No mounts overlay needed here: `down` finds containers by the project name
# (fixed in docker-compose.yml), not by re-reading volume paths - so stopping
# shouldn't fail just because a drive from mounts.txt is unplugged.
docker compose -f docker-compose.yml down

# Frees the VM's RAM/CPU until you run start.sh again (macOS only - Linux
# has no VM to stop).
if [ "$(uname -s)" = "Darwin" ]; then
  colima stop --profile tabseet-flex
fi
