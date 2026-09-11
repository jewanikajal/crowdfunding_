#!/bin/bash

# ============================================================
# SINGLE CHANNEL FAILURE & RECOVERY TEST SUITE
# Crowdfunding Investment Platform (CIP)
# Network: Microfab
# Channel: defaultchannel
# Chaincode: cipcc
# ============================================================

CHANNEL="defaultchannel"
CHAINCODE="cipcc"
ORDERER="orderer-api.127-0-0-1.nip.io:9090"

BASE_PATH="/mnt/c/Users/LENOVO/Desktop/crowdfunding"

RESULTS_DIR="./results/failure"
mkdir -p "$RESULTS_DIR"

PASS=0
FAIL=0
TOTAL=0

pass() {
  echo " ✅ PASS — $1"
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "PASS,$1" >> "$RESULTS_DIR/failure_results.csv"
}

fail() {
  echo " ❌ FAIL — $1"
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "FAIL,$1" >> "$RESULTS_DIR/failure_results.csv"
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
# SETUP BASE ENTITIES
# ============================================================

setup() {
  section "SETUP — Creating base startup & investor"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterStartup","Args":["sfail","FailStartup","fail@startup.com","PANFL1","GSTFL1","2022-01-01","fintech","product","India","MH","Pune","www.fail.com","Failure test","2022","Founder"]}' \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateStartup","Args":["sfail","APPROVED"]}' \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterInvestor","Args":["ifail","FailInvestor","fail@inv.com","PANFL2","AADHARFL2","angel","India","MH","Mumbai","fintech","large","1000000",""]}' \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateInvestor","Args":["ifail","APPROVED"]}' \
    > /dev/null 2>&1
  sleep 1

  echo " Setup complete."
}

# ============================================================
# TEST 1 — FUND CLOSED PROJECT
# ============================================================

test_fund_closed_project() {
  section "TEST 1 — FUND CLOSED PROJECT"

  pid="closed_$$_1"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"sfail\",\"Closed\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"Fund\",\"Args\":[\"$pid\",\"ifail\",\"100000\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_platform_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ReleaseFunds\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"Fund\",\"Args\":[\"$pid\",\"ifail\",\"50000\"]}" 2>&1)

  if echo "$out" | grep -qiE "not open|closed|error|500"; then
    pass "Funding closed project correctly rejected"
  else
    fail "Closed project funding allowed"
    echo " Output: $out"
  fi
}

# ============================================================
# TEST 2 — DOUBLE RELEASE
# ============================================================

test_double_release() {
  section "TEST 2 — DOUBLE RELEASE"

  pid="release_$$_2"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"sfail\",\"Release\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"Fund\",\"Args\":[\"$pid\",\"ifail\",\"100000\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_platform_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ReleaseFunds\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ReleaseFunds\",\"Args\":[\"$pid\"]}" 2>&1)

  if echo "$out" | grep -qiE "not fully funded|closed|error|500"; then
    pass "Double release correctly rejected"
  else
    fail "Double release allowed"
    echo " Output: $out"
  fi
}

# ============================================================
# TEST 3 — REFUND ACTIVE PROJECT
# ============================================================

test_refund_active_project() {
  section "TEST 3 — REFUND ACTIVE PROJECT"

  pid="refund_$$_3"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"sfail\",\"Refund\",\"Test\",\"200000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"Fund\",\"Args\":[\"$pid\",\"ifail\",\"50000\"]}" \
    > /dev/null 2>&1
  sleep 1

  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"Refund\",\"Args\":[\"$pid\",\"ifail\"]}" 2>&1)

  if echo "$out" | grep -qiE "cancelled|refund only allowed|error|500"; then
    pass "Refund on active project correctly rejected"
  else
    fail "Refund allowed on active project"
    echo " Output: $out"
  fi
}

# ============================================================
# TEST 4 — DOUBLE APPROVAL
# ============================================================

test_double_approve() {
  section "TEST 4 — DOUBLE APPROVAL"

  pid="approve_$$_4"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"sfail\",\"Approve\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" 2>&1)

  if echo "$out" | grep -qiE "already|error|500"; then
    pass "Double approval rejected"
  else
    fail "Double approval allowed"
    echo " Output: $out"
  fi
}

# ============================================================
# TEST 5 — QUERY NON-EXISTENT ENTITY
# ============================================================

test_query_nonexistent() {
  section "TEST 5 — QUERY NON-EXISTENT ENTITY"

  set_validator_env
  out=$(peer chaincode query -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"GetStartup","Args":["ghost"]}' 2>&1)

  if echo "$out" | grep -qiE "not found|error"; then
    pass "Non-existent startup query rejected"
  else
    fail "Ghost startup returned data"
    echo " Output: $out"
  fi
}

# ============================================================
# MAIN
# ============================================================

echo ""
echo "============================================"
echo " SINGLE CHANNEL FAILURE TEST SUITE"
echo " Channel: $CHANNEL"
echo " Chaincode: $CHAINCODE"
echo "============================================"

> "$RESULTS_DIR/failure_results.csv"
echo "status,test_name" >> "$RESULTS_DIR/failure_results.csv"

setup
sleep 2

test_fund_closed_project
sleep 1
test_double_release
sleep 1
test_refund_active_project
sleep 1
test_double_approve
sleep 1
test_query_nonexistent

echo ""
echo "============================================"
echo " FAILURE TEST SUMMARY"
echo "============================================"
echo " Total Tests : $TOTAL"
echo " Passed      : $PASS"
echo " Failed      : $FAIL"
echo " Pass Rate   : $(echo "scale=1; $PASS*100/$TOTAL" | bc)%"
echo "============================================"