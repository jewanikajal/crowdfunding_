#!/bin/bash

# ============================================================================
# TEST 1: STARTUPORG - CREATE CAMPAIGNS
# ============================================================================
# This script tests campaign creation by StartupOrg
# ============================================================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
CHANNEL_NAME="gov-validation-channel"
CHAINCODE_NAME="governancecc"
NUM_CAMPAIGNS=50

# StartupOrg Configuration
export CORE_PEER_TLS_ENABLED=false
export CORE_PEER_LOCALMSPID="StartupOrgMSP"
export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090
export CORE_PEER_MSPCONFIGPATH=/mnt/c/Users/LENOVO/Desktop/crowdfunding_cc_2/_msp/StartupOrg/startuporgadmin/msp

# Results
RESULTS_FILE="test1_startup_results_$(date +%Y%m%d_%H%M%S).txt"
CAMPAIGN_IDS_FILE="campaign_ids.txt"

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }
print_metric() { echo -e "${YELLOW}📊 $1: ${GREEN}$2${NC}"; }

calculate_tps() {
    local transactions=$1
    local time_taken=$2
    if [ "$time_taken" -gt 0 ]; then
        echo "scale=2; $transactions / $time_taken" | bc
    else
        echo "0"
    fi
}

# ============================================================================
# PRE-TEST CHECKS
# ============================================================================

print_header "TEST 1: STARTUPORG - CREATE CAMPAIGNS"

print_info "Organization: StartupOrg"
print_info "Peer: $CORE_PEER_ADDRESS"
print_info "MSP: $CORE_PEER_LOCALMSPID"
print_info "Channel: $CHANNEL_NAME"
print_info "Chaincode: $CHAINCODE_NAME"
print_info "Campaigns to create: $NUM_CAMPAIGNS"
echo ""

# Verify connection
if ! peer channel list > /dev/null 2>&1; then
    print_error "Cannot connect to peer"
    exit 1
fi
print_success "Peer connection verified"

# Clear previous campaign IDs
> $CAMPAIGN_IDS_FILE

read -p "Press Enter to start creating campaigns..."

# ============================================================================
# CREATE CAMPAIGNS
# ============================================================================

print_header "Creating $NUM_CAMPAIGNS Campaigns"

START_TIME=$(date +%s)
SUCCESS_COUNT=0
FAIL_COUNT=0
LATENCIES=()

for i in $(seq 1 $NUM_CAMPAIGNS); do
    CAMPAIGN_ID="CAMP_$(date +%s%N)_$i"
    
    TX_START=$(date +%s%N)
    
    RESULT=$(peer chaincode invoke \
        -C $CHANNEL_NAME \
        -n $CHAINCODE_NAME \
        --peerAddresses $CORE_PEER_ADDRESS \
        -c "{\"function\":\"CreateCampaign\",\"Args\":[\"$CAMPAIGN_ID\",\"Test Campaign $i\",\"STARTUP_001\",\"Performance test campaign\",\"100000\"]}" \
        2>&1)
    
    TX_END=$(date +%s%N)
    LATENCY=$(( (TX_END - TX_START) / 1000000 ))
    LATENCIES+=($LATENCY)
    
    if echo "$RESULT" | grep -q "Chaincode invoke successful\|status:200"; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -ne "${GREEN}✓${NC}"
        # Save campaign ID for next tests
        echo "$CAMPAIGN_ID" >> $CAMPAIGN_IDS_FILE
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo -ne "${RED}✗${NC}"
        if [ $FAIL_COUNT -eq 1 ]; then
            echo -e "\n${YELLOW}First error:${NC}"
            echo "$RESULT"
        fi
    fi
    
    if [ $((i % 10)) -eq 0 ]; then
        echo -ne " [$i/$NUM_CAMPAIGNS]"
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Calculate average latency
if [ ${#LATENCIES[@]} -gt 0 ]; then
    TOTAL_LATENCY=0
    for lat in "${LATENCIES[@]}"; do
        TOTAL_LATENCY=$((TOTAL_LATENCY + lat))
    done
    AVG_LATENCY=$((TOTAL_LATENCY / ${#LATENCIES[@]}))
else
    AVG_LATENCY=0
fi

# ============================================================================
# RESULTS
# ============================================================================

echo -e "\n"
print_header "TEST 1 RESULTS"

print_metric "Campaigns Created" "$SUCCESS_COUNT/$NUM_CAMPAIGNS"
print_metric "Failed" "$FAIL_COUNT/$NUM_CAMPAIGNS"
print_metric "Time Taken" "${DURATION}s"
print_metric "TPS" "$(calculate_tps $SUCCESS_COUNT $DURATION)"
print_metric "Avg Latency" "${AVG_LATENCY}ms"

if [ $SUCCESS_COUNT -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; ($SUCCESS_COUNT * 100) / $NUM_CAMPAIGNS" | bc)
    print_metric "Success Rate" "${SUCCESS_RATE}%"
fi

echo ""
if [ $SUCCESS_COUNT -eq $NUM_CAMPAIGNS ]; then
    print_success "ALL CAMPAIGNS CREATED SUCCESSFULLY! 🎉"
    print_info "Campaign IDs saved to: $CAMPAIGN_IDS_FILE"
    print_info "Run test2_validator_risk.sh next to set risk scores"
else
    echo -e "${YELLOW}Some campaigns failed. Check errors above.${NC}"
fi

# Save results
{
    echo "=================================="
    echo "TEST 1: STARTUPORG - CREATE CAMPAIGNS"
    echo "Date: $(date)"
    echo "=================================="
    echo ""
    echo "Campaigns Created: $SUCCESS_COUNT/$NUM_CAMPAIGNS"
    echo "Failed: $FAIL_COUNT"
    echo "Time Taken: ${DURATION}s"
    echo "TPS: $(calculate_tps $SUCCESS_COUNT $DURATION)"
    echo "Avg Latency: ${AVG_LATENCY}ms"
} > $RESULTS_FILE

print_info "Results saved to: $RESULTS_FILE"
echo ""