#!/bin/bash

# ============================================================================
# TEST 2: VALIDATORORG - SET RISK SCORES
# ============================================================================
# This script tests setting risk scores by ValidatorOrg
# Run test1_startup_create.sh first to create campaigns
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
CAMPAIGN_IDS_FILE="campaign_ids.txt"

# ValidatorOrg Configuration
export CORE_PEER_TLS_ENABLED=false
export CORE_PEER_LOCALMSPID="ValidatorOrgMSP"
export CORE_PEER_ADDRESS=validatororgpeer-api.127-0-0-1.nip.io:9090
export CORE_PEER_MSPCONFIGPATH=/mnt/c/Users/LENOVO/Desktop/crowdfunding_cc_2/_msp/ValidatorOrg/validatororgadmin/msp

# Results
RESULTS_FILE="test2_validator_results_$(date +%Y%m%d_%H%M%S).txt"

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

print_header "TEST 2: VALIDATORORG - SET RISK SCORES"

print_info "Organization: ValidatorOrg"
print_info "Peer: $CORE_PEER_ADDRESS"
print_info "MSP: $CORE_PEER_LOCALMSPID"
print_info "Channel: $CHANNEL_NAME"
print_info "Chaincode: $CHAINCODE_NAME"
echo ""

# Check if campaign IDs file exists
if [ ! -f "$CAMPAIGN_IDS_FILE" ]; then
    print_error "Campaign IDs file not found: $CAMPAIGN_IDS_FILE"
    echo "Please run test1_startup_create.sh first"
    exit 1
fi

NUM_CAMPAIGNS=$(wc -l < $CAMPAIGN_IDS_FILE)
print_info "Found $NUM_CAMPAIGNS campaigns to validate"

# Verify connection
if ! peer channel list > /dev/null 2>&1; then
    print_error "Cannot connect to peer"
    exit 1
fi
print_success "Peer connection verified"

echo ""
read -p "Press Enter to start setting risk scores..."

# ============================================================================
# SET RISK SCORES
# ============================================================================

print_header "Setting Risk Scores for $NUM_CAMPAIGNS Campaigns"

START_TIME=$(date +%s)
SUCCESS_COUNT=0
FAIL_COUNT=0
LATENCIES=()
PROCESSED=0

while IFS= read -r CAMPAIGN_ID; do
    PROCESSED=$((PROCESSED + 1))
    
    # Random risk score between 60-95
    RISK_SCORE=$((60 + RANDOM % 36))
    
    TX_START=$(date +%s%N)
    
    RESULT=$(peer chaincode invoke \
        -C $CHANNEL_NAME \
        -n $CHAINCODE_NAME \
        --peerAddresses $CORE_PEER_ADDRESS \
        -c "{\"function\":\"SetRiskScore\",\"Args\":[\"$CAMPAIGN_ID\",\"$RISK_SCORE\"]}" \
        2>&1)
    
    TX_END=$(date +%s%N)
    LATENCY=$(( (TX_END - TX_START) / 1000000 ))
    LATENCIES+=($LATENCY)
    
    if echo "$RESULT" | grep -q "Chaincode invoke successful\|status:200"; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -ne "${GREEN}✓${NC}"
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo -ne "${RED}✗${NC}"
        if [ $FAIL_COUNT -eq 1 ]; then
            echo -e "\n${YELLOW}First error:${NC}"
            echo "$RESULT"
        fi
    fi
    
    if [ $((PROCESSED % 10)) -eq 0 ]; then
        echo -ne " [$PROCESSED/$NUM_CAMPAIGNS]"
    fi
done < $CAMPAIGN_IDS_FILE

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
print_header "TEST 2 RESULTS"

print_metric "Risk Scores Set" "$SUCCESS_COUNT/$NUM_CAMPAIGNS"
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
    print_success "ALL RISK SCORES SET SUCCESSFULLY! 🎉"
    print_info "Run test3_validator_compliance.sh next to set compliance scores"
else
    echo -e "${YELLOW}Some operations failed. Check errors above.${NC}"
fi

# Save results
{
    echo "=================================="
    echo "TEST 2: VALIDATORORG - SET RISK SCORES"
    echo "Date: $(date)"
    echo "=================================="
    echo ""
    echo "Risk Scores Set: $SUCCESS_COUNT/$NUM_CAMPAIGNS"
    echo "Failed: $FAIL_COUNT"
    echo "Time Taken: ${DURATION}s"
    echo "TPS: $(calculate_tps $SUCCESS_COUNT $DURATION)"
    echo "Avg Latency: ${AVG_LATENCY}ms"
} > $RESULTS_FILE

print_info "Results saved to: $RESULTS_FILE"
echo ""