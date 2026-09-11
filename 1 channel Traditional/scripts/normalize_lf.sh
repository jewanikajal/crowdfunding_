#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
while IFS= read -r -d '' f; do
  sed -i 's/\r$//' "$f"
done < <(find . -type f \( -name "*.sh" -o -name "network.config" \) -print0)
echo "Normalized LF endings for shell scripts and network.config"
