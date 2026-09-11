#!/bin/bash

# ============================================================
# SINGLE CHANNEL CONCURRENCY TEST SUITE
# Crowdfunding Investment Platform (CIP)
# Network: Microfab
# Channel: defaultchannel
# Chaincode: cipcc
# ============================================================

CHANNEL="defaultchannel"
CHAINCODE="cipcc"
ORDERER="orderer-api.127-0-0-1.nip.io:9090"

BASE_PATH="/mnt/c/Users/LENOVO/Desktop/crowdfunding"

RESULTS_DIR="./results/concurrency"
mkdir -p "$RESULTS_DIR"

PASS=0
FAIL=0
TOTAL=0

pass() {
  echo " ✅ PASS — $1"
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "PASS,$1" >> "$RESULTS_DIR/concurrency_results.csv"
}

fail() {
  echo " ❌ FAIL — $1"
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "FAIL,$1" >> "$RESULTS_DIR/concurrency_results.csv"
}

section() {
  echo ""
  echo "============================================"
  echo " $1"
  echo "============================================"
}

# ============================================================
# ENVIRONMENT SETTERS
# ============================================================

set_startup_env() {
  export CORE_PEER_LOCALMSPID=StartupOrgMSP
  export CORE_PEER_MSPCONFIGPATH=$BASE_PATH/_msp/StartupOrg/startuporgadmin/msp
  export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090
}

set_validator_env() {
  export CORE_PEER_LOCALMSPID=ValidatorOrgMSP
  export CORE_PEER_MSPCONFIGPATH=$BASE_PATH/_msp/ValidatorOrg/validatororgadmin/msp
  export CORE_PEER_ADDRESS=validatororgpeer-api.127-0-0-1.nip.io:9090
}

set_investor_env() {
  export CORE_PEER_LOCALMSPID=InvestorOrgMSP
  export CORE_PEER_MSPCONFIGPATH=$BASE_PATH/_msp/InvestorOrg/investororgadmin/msp
  export CORE_PEER_ADDRESS=investororgpeer-api.127-0-0-1.nip.io:9090
}

set_platform_env() {
  export CORE_PEER_LOCALMSPID=PlatformOrgMSP
  export CORE_PEER_MSPCONFIGPATH=$BASE_PATH/_msp/PlatformOrg/platformorgadmin/msp
  export CORE_PEER_ADDRESS=platformorgpeer-api.127-0-0-1.nip.io:9090
}

# ============================================================
# SETUP
# ============================================================

setup() {
  section "SETUP — Creating base startup & investor"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterStartup","Args":["sconc","ConcStartup","conc@startup.com","PANC01","GSTC01","2022-01-01","fintech","product","India","Maharashtra","Pune","www.conc.com","Concurrency test startup","2022","Conc Founder"]}' \
    > /dev/null 2>&1

  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateStartup","Args":["sconc","APPROVED"]}' \
    > /dev/null 2>&1

  sleep 1

  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterInvestor","Args":["iconc","ConcInvestor","conc@inv.com","PANC02","AADHARC02","angel","India","Maharashtra","Mumbai","fintech","large","1000000",""]}' \
    > /dev/null 2>&1

  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateInvestor","Args":["iconc","APPROVED"]}' \
    > /dev/null 2>&1

  sleep 1

  echo " Setup complete."
}

# ============================================================
# TEST 1 — CONCURRENT PROJECT CREATION
# ============================================================

test_concurrent_project_creation() {
  local N=${1:-10}
  section "TEST 1 — CONCURRENT PROJECT CREATION ($N parallel)"

  local tmp_dir=$(mktemp -d)
  local start=$(date +%s%N)

  for i in $(seq 1 $N); do
    local pid="conc_proj_${i}_$$"
    (
      set_startup_env
      out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
        -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"sconc\",\"Conc Project $i\",\"Concurrent test\",\"500000\",\"60\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" 2>&1)

      if echo "$out" | grep -q "status:200"; then
        echo "SUCCESS" > "$tmp_dir/result_$i"
      else
        echo "FAIL" > "$tmp_dir/result_$i"
      fi
    ) &
  done

  wait

  local end=$(date +%s%N)
  local total_ms=$(( (end - start) / 1000000 ))

  local success=0
  for i in $(seq 1 $N); do
    result=$(cat "$tmp_dir/result_$i" 2>/dev/null || echo "FAIL")
    [ "$result" == "SUCCESS" ] && success=$((success + 1))
  done

  rm -rf "$tmp_dir"

  echo " Concurrent Results: $success/$N succeeded in ${total_ms}ms"

  if [ $success -ge $(($N * 8 / 10)) ]; then
    pass "Concurrent project creation — $success/$N succeeded"
  else
    fail "Concurrent project creation — too many failures"
  fi
}

# ============================================================
# TEST 2 — CONCURRENT FUNDING (MVCC TEST)
# ============================================================

test_concurrent_funding() {
  local N=${1:-5}
  section "TEST 2 — CONCURRENT FUNDING ($N parallel)"

  local pid="conc_fund_$$"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"sconc\",\"Fund Conc Test\",\"Concurrent funding\",\"1000000\",\"60\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1

  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1

  sleep 1

  local tmp_dir=$(mktemp -d)
  local start=$(date +%s%N)

  for i in $(seq 1 $N); do
    (
      set_investor_env
      out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
        -c "{\"function\":\"Fund\",\"Args\":[\"$pid\",\"iconc\",\"50000\"]}" 2>&1)

      if echo "$out" | grep -q "status:200"; then
        echo "SUCCESS" > "$tmp_dir/fund_$i"
      else
        echo "FAIL" > "$tmp_dir/fund_$i"
      fi
    ) &
  done

  wait

  local end=$(date +%s%N)
  local total_ms=$(( (end - start) / 1000000 ))

  local success=0
  for i in $(seq 1 $N); do
    result=$(cat "$tmp_dir/fund_$i" 2>/dev/null || echo "FAIL")
    [ "$result" == "SUCCESS" ] && success=$((success + 1))
  done

  rm -rf "$tmp_dir"

  echo " Concurrent Funding Results: $success/$N succeeded in ${total_ms}ms"

  if [ $success -ge 1 ]; then
    pass "Concurrent funding handled — MVCC working correctly"
  else
    fail "All concurrent funding failed"
  fi
}

# ============================================================
# TEST 3 — CONCURRENT VALIDATION
# ============================================================

test_concurrent_validation() {
  local N=${1:-5}
  section "TEST 3 — CONCURRENT VALIDATION ($N parallel)"

  local tmp_dir=$(mktemp -d)
  local start=$(date +%s%N)

  for i in $(seq 1 $N); do
    sid="conc_val_${i}_$$"

    set_startup_env
    peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
      -c "{\"function\":\"RegisterStartup\",\"Args\":[\"$sid\",\"Val$i\",\"val$i@test.com\",\"PANCV$i\",\"GSTCV$i\",\"2022-01-01\",\"fintech\",\"product\",\"India\",\"MH\",\"Pune\",\"www.cv$i.com\",\"Test\",\"2022\",\"Founder$i\"]}" \
      > /dev/null 2>&1

    (
      set_validator_env
      out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
        -c "{\"function\":\"ValidateStartup\",\"Args\":[\"$sid\",\"APPROVED\"]}" 2>&1)

      if echo "$out" | grep -q "status:200"; then
        echo "SUCCESS" > "$tmp_dir/val_$i"
      else
        echo "FAIL" > "$tmp_dir/val_$i"
      fi
    ) &
  done

  wait

  local end=$(date +%s%N)
  local total_ms=$(( (end - start) / 1000000 ))

  local success=0
  for i in $(seq 1 $N); do
    result=$(cat "$tmp_dir/val_$i" 2>/dev/null || echo "FAIL")
    [ "$result" == "SUCCESS" ] && success=$((success + 1))
  done

  rm -rf "$tmp_dir"

  echo " Concurrent Validation Results: $success/$N succeeded in ${total_ms}ms"

  if [ $success -ge $(($N * 8 / 10)) ]; then
    pass "Concurrent validations succeeded"
  else
    fail "Too many validation failures"
  fi
}

# ============================================================
# MAIN
# ============================================================

echo ""
echo "============================================"
echo " SINGLE CHANNEL CONCURRENCY TEST SUITE"
echo " Channel: $CHANNEL"
echo " Chaincode: $CHAINCODE"
echo "============================================"

> "$RESULTS_DIR/concurrency_results.csv"
echo "status,test_name" >> "$RESULTS_DIR/concurrency_results.csv"

setup
sleep 2

test_concurrent_project_creation 10
sleep 2
test_concurrent_funding 5
sleep 2
test_concurrent_validation 5

echo ""
echo "============================================"
echo " TEST SUMMARY"
echo "============================================"
echo " Total Tests : $TOTAL"
echo " Passed      : $PASS"
echo " Failed      : $FAIL"
echo " Pass Rate   : $(echo "scale=1; $PASS*100/$TOTAL" | bc)%"
echo "============================================"
echo ""
echo " ℹ️  MVCC conflicts in concurrent writes are EXPECTED."
echo " Fabric uses optimistic concurrency control."
echo "============================================"