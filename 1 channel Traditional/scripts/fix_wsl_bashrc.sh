#!/usr/bin/env bash
set -euo pipefail
BASHRC="$HOME/.bashrc"
awk 'BEGIN{keep=1} /^# Clean PATH for Fabric$/{keep=0} {if(keep) print}' "$BASHRC" > "$BASHRC.tmp"
mv "$BASHRC.tmp" "$BASHRC"
cat >> "$BASHRC" <<'EOF'
# Clean PATH for Fabric
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/go/bin
export PATH=$PATH:/mnt/c/Users/siddi/fabric-crowdfunding-network
export PATH=$PATH:/mnt/c/Users/siddi/fabric-crowdfunding-network/fabric-samples/bin
EOF
