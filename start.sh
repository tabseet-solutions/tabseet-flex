#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

./generate-mounts.sh

# macOS has no native container runtime, so this app runs Docker inside its
# own dedicated Colima VM profile - keeps it from touching/restarting
# whatever else you have running under your default Docker context. Linux
# (and WSL2, which is a real Linux kernel) already has a native Docker
# daemon: no VM, no mount flags, host paths bind-mount directly.
if [ "$(uname -s)" = "Darwin" ]; then
  # shellcheck source=colima-mounts.generated.sh
  source ./colima-mounts.generated.sh

  if ! colima status --profile tabseet-flex >/dev/null 2>&1; then
    colima start --profile tabseet-flex \
      "${COLIMA_MOUNTS[@]}" \
      --mount "$(pwd):w" \
      --cpu 4 --memory 4 --disk 20
  fi

  export DOCKER_HOST="unix://${HOME}/.colima/tabseet-flex/docker.sock"
fi

docker compose -f docker-compose.yml -f docker-compose.mounts.generated.yml up -d --build

echo ""
echo "Tabseet Flex running at http://localhost:4400"
