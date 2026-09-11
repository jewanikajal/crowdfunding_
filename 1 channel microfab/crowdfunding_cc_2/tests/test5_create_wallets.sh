#!/bin/bash

# ============================================================================
# TEST 5: PLATFORMORG — CREATE WALLETS LOAD TEST
# Channel: investment-execution-channel
# Chaincode: investmentcc
# ============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHANNEL_NAME="investment-execution-channel"
CHAINCODE_NAME="investmentcc"
NUM_WALLETS=100

# 🔧 UPDATE THIS PATH FOR YOUR MACHINE
BASE="/mnt/c/Users/LENOVO/Desktop/crowdfunding_cc_2"

export CORE_PEER_TLS_ENABLED=false
export CORE_PEER_LOCALMSPID="PlatformOrgMSP"
export CORE_PEER_ADDRESS=platformorgpeer-api.127-0-0-1.nip.io:9090
export CORE_PEER_MSPCONFIGPATH="$BASE/_msp/PlatformOrg/platformorgadmin/msp"

RESULTS="test5_wallet_results_$(date +%H%M%S).txt"

echo -e "${BLUE}=== TEST 5 — WALLET CREATION LOAD ===${NC}"
echo "Wallets to create: $NUM_WALLETS"
echo ""

peer channel list > /dev/null || {
  echo -e "${RED}Peer connection failed${NC}"
  exit 1
}

START=$(date +%s)
SUCCESS=0
FAIL=0

for i in $(seq 1 $NUM_WALLETS)
do
  WALLET_ID="WALLET_LOAD_$i"
  OWNER_ID="OWNER_$i"

  OUT=$(peer chaincode invoke \
    -C $CHANNEL_NAME \
    -n $CHAINCODE_NAME \
    --peerAddresses $CORE_PEER_ADDRESS \
    --waitForEvent \
    -c "{\"function\":\"CreateWallet\",\"Args\":[\"$WALLET_ID\",\"$OWNER_ID\",\"INVESTOR\",\"100000\"]}" \
    2>&1)

  if echo "$OUT" | grep -q "status:200"; then
    SUCCESS=$((SUCCESS+1))
    echo -ne "${GREEN}✓${NC}"
  else
    FAIL=$((FAIL+1))
    echo -ne "${RED}✗${NC}"
    if [ $FAIL -eq 1 ]; then
      echo ""
      echo "$OUT"
    fi
  fi

  if [ $((i % 20)) -eq 0 ]; then
    echo -ne " [$i/$NUM_WALLETS]"
  fi
done

END=$(date +%s)
DUR=$((END-START))

TPS=0
if [ $DUR -gt 0 ]; then
  TPS=$(echo "scale=2; $SUCCESS / $DUR" | bc)
fi

echo ""
echo -e "${YELLOW}Wallets created:${NC} $SUCCESS/$NUM_WALLETS"
echo -e "${YELLOW}Failed:${NC} $FAIL"
echo -e "${YELLOW}Time:${NC} ${DUR}s"
echo -e "${YELLOW}TPS:${NC} $TPS"

cat <<EOF > $RESULTS
Wallets: $SUCCESS/$NUM_WALLETS
Failed: $FAIL
Time: ${DUR}s
TPS: $TPS
EOF

echo "Results saved → $RESULTS"
