#!/usr/bin/env bash
# Reads mounts.txt and generates:
#   - docker-compose.mounts.generated.yml   (the dynamic volumes: list)
#   - colima-mounts.generated.sh            (a COLIMA_MOUNTS bash array)
#
# Plain bash, no templating engine needed - Compose YAML has no loop
# construct, so the volumes list has to be (re)generated as text, but a
# line-by-line read + printf is all that takes.
set -euo pipefail
cd "$(dirname "$0")"

MOUNTS_FILE="mounts.txt"
COMPOSE_OUT="docker-compose.mounts.generated.yml"
COLIMA_OUT="colima-mounts.generated.sh"

declare -A seen_drives=()
colima_args=()
compose_lines=()

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
  compose_lines+=("      - \"${host_path}:${container_path}:${mode}\"")

  # Resolve the actual filesystem mount point rather than assuming a fixed
  # layout like macOS's /Volumes/<drive> - Linux/WSL2 mount external drives
  # under /media, /mnt, etc. `df -P` is the POSIX single-line form, supported
  # by both macOS/BSD and GNU coreutils df.
  drive="$(df -P "$host_path" | awk 'NR==2 { print $NF; exit }')"
  if [ -z "${seen_drives[$drive]:-}" ]; then
    seen_drives[$drive]=1
    colima_args+=(--mount "${drive}:w")
  fi
done <"$MOUNTS_FILE"

if [ ${#compose_lines[@]} -eq 0 ]; then
  echo "mounts.txt has no valid entries - add at least one absolute path" >&2
  exit 1
fi

{
  echo "services:"
  echo "  tabseet-flex:"
  echo "    volumes:"
  printf '%s\n' "${compose_lines[@]}"
} >"$COMPOSE_OUT"

{
  echo "# Auto-generated from mounts.txt by generate-mounts.sh - do not edit by hand."
  printf 'COLIMA_MOUNTS=('
  for a in "${colima_args[@]}"; do
    printf '%q ' "$a"
  done
  printf ')\n'
} >"$COLIMA_OUT"
