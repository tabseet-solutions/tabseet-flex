#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Reads mounts.txt and builds, in memory, the two things it drives:
#   - the dynamic `volumes:` overlay for docker-compose.yml
#   - (macOS only) the Colima VM's `--mount` flags
# There's no templating engine here (Jinja and friends are overkill for one
# YAML list) - just a line-by-line read + printf, piped straight into
# `docker compose` via stdin instead of writing a generated file to disk.
MOUNTS_FILE="mounts.txt"

compose_volumes=()
colima_mounts=()
declare -A seen_drives=()

while IFS= read -r raw || [ -n "$raw" ]; do
  line="${raw%%#*}"
  line="$(echo "$line" | xargs)"
  [ -z "$line" ] && continue

  host_path="${line%%:*}"
  mode="ro"
  [[ "$line" == *:rw ]] && mode="rw"

  case "$host_path" in
    /*) ;;
    *)
      echo "mounts.txt: skipping '$host_path' - must be an absolute path" >&2
      continue
      ;;
  esac

  if [ ! -e "$host_path" ]; then
    echo "mounts.txt: skipping '$host_path' - path does not exist" >&2
    continue
  fi

  container_path="/media${host_path}"
  compose_volumes+=("      - \"${host_path}:${container_path}:${mode}\"")

  if [ "$(uname -s)" = "Darwin" ]; then
    # Resolve the actual filesystem mount point rather than assuming a fixed
    # layout like macOS's /Volumes/<drive> - Linux/WSL2 mount external drives
    # under /media, /mnt, etc. `df -P` is the POSIX single-line form,
    # supported by both macOS/BSD and GNU coreutils df.
    drive="$(df -P "$host_path" | awk 'NR==2 { print $NF; exit }')"
    if [ -z "${seen_drives[$drive]:-}" ]; then
      seen_drives[$drive]=1
      colima_mounts+=(--mount "${drive}:w")
    fi
  fi
done <"$MOUNTS_FILE"

if [ ${#compose_volumes[@]} -eq 0 ]; then
  echo "mounts.txt has no valid entries - add at least one absolute path" >&2
  exit 1
fi

# macOS has no native container runtime, so this app runs Docker inside its
# own dedicated Colima VM profile - keeps it from touching/restarting
# whatever else you have running under your default Docker context. Linux
# (and WSL2, which is a real Linux kernel) already has a native Docker
# daemon: no VM, no mount flags, host paths bind-mount directly.
if [ "$(uname -s)" = "Darwin" ]; then
  if ! colima status --profile tabseet-flex >/dev/null 2>&1; then
    colima start --profile tabseet-flex \
      "${colima_mounts[@]}" \
      --mount "$(pwd):w" \
      --cpu 4 --memory 4 --disk 20
  fi

  export DOCKER_HOST="unix://${HOME}/.colima/tabseet-flex/docker.sock"
fi

{
  echo "services:"
  echo "  tabseet-flex:"
  echo "    volumes:"
  printf '%s\n' "${compose_volumes[@]}"
} | docker compose -f docker-compose.yml -f - up -d --build

echo ""
echo "Tabseet Flex running at http://localhost:4400"
