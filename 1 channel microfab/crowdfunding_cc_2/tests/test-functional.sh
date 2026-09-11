#!/bin/bash

# ============================================================
# SINGLE CHANNEL FUNCTIONAL TEST SUITE
# Crowdfunding Investment Platform (CIP)
# Channel: defaultchannel
# Chaincode: cipcc
# ============================================================

CHANNEL="defaultchannel"
CHAINCODE="cipcc"
ORDERER="orderer-api.127-0-0-1.nip.io:9090"

BASE_PATH="/mnt/c/Users/LENOVO/Desktop/crowdfunding"

RESULTS_DIR="./results/functional"
mkdir -p "$RESULTS_DIR"

PASS=0
FAIL=0
TOTAL=0

pass() {
  echo " ✅ PASS — $1"
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "PASS,$1" >> "$RESULTS_DIR/functional_results.csv"
}

fail() {
  echo " ❌ FAIL — $1"
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "FAIL,$1" >> "$RESULTS_DIR/functional_results.csv"
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
  section "SETUP — Base Startup & Investor"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterStartup","Args":["sfunc","FuncStartup","func@startup.com","PANF01","GSTF01","2022-06-01","fintech","product","India","MH","Pune","www.func.com","Functional test","2022","Founder"]}' \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateStartup","Args":["sfunc","APPROVED"]}' \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterInvestor","Args":["ifunc","FuncInvestor","func@inv.com","PANF02","AADHARF02","angel","India","MH","Mumbai","fintech","large","1000000",""]}' \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateInvestor","Args":["ifunc","APPROVED"]}' \
    > /dev/null 2>&1
  sleep 1

  echo " Setup complete."
}

# ============================================================
# TEST 1 — DUPLICATE REGISTRATION
# ============================================================

test_duplicate_registration() {
  section "TEST 1 — DUPLICATE REGISTRATION"

  set_startup_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterStartup","Args":["sfunc","DupStartup","dup@x.com","PAND","GSTD","2022","fin","prod","India","MH","Pune","www","dup","2022","Founder"]}' 2>&1)

  if echo "$out" | grep -qiE "already|error|500"; then
    pass "Duplicate startup rejected"
  else
    fail "Duplicate startup allowed"
  fi

  set_investor_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterInvestor","Args":["ifunc","DupInvestor","dup@x.com","PAND2","AADHAR2","angel","India","MH","Mumbai","fin","large","1000000",""]}' 2>&1)

  if echo "$out" | grep -qiE "already|error|500"; then
    pass "Duplicate investor rejected"
  else
    fail "Duplicate investor allowed"
  fi
}

# ============================================================
# TEST 2 — INVALID FUND AMOUNT
# ============================================================

test_invalid_amount() {
  section "TEST 2 — INVALID FUND AMOUNT"

  pid="func_amt_$$"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"sfunc\",\"AmtTest\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"Fund\",\"Args\":[\"$pid\",\"ifunc\",\"0\"]}" 2>&1)

  if echo "$out" | grep -qiE "invalid|error|500"; then
    pass "Zero funding rejected"
  else
    fail "Zero funding allowed"
  fi
}

# ============================================================
# TEST 3 — PROJECT REJECT FLOW
# ============================================================

test_reject_flow() {
  section "TEST 3 — PROJECT REJECT FLOW"

  pid="func_rej_$$"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"sfunc\",\"RejectTest\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"RejectProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  out=$(peer chaincode query -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"GetProject\",\"Args\":[\"$pid\"]}" 2>&1)

  if echo "$out" | grep -q "CANCELLED"; then
    pass "Project rejected correctly"
  else
    fail "Project rejection failed"
  fi
}

# ============================================================
# TEST 4 — DISPUTE FLOW
# ============================================================

test_dispute_flow() {
  section "TEST 4 — DISPUTE FLOW"

  pid="func_disp_$$"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"sfunc\",\"Dispute\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"Fund\",\"Args\":[\"$pid\",\"ifunc\",\"50000\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"RaiseDispute\",\"Args\":[\"$pid\",\"ifunc\",\"Issue\"]}" 2>&1)

  if echo "$out" | grep -q "status:200"; then
    pass "Dispute raised"
  else
    fail "Dispute raising failed"
  fi
}

# ============================================================
# TEST 5 — UNVALIDATED STARTUP BLOCK
# ============================================================

test_unvalidated_entity() {
  section "TEST 5 — UNVALIDATED STARTUP"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterStartup","Args":["sunval","Unval","u@x.com","PANU","GSTU","2022","fin","prod","India","MH","Pune","www","u","2022","Founder"]}' \
    > /dev/null 2>&1
  sleep 1

  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"CreateProject","Args":["punval","sunval","Test","Test","100000","30","fin","equity","India","SMEs","mvp"]}' 2>&1)

  if echo "$out" | grep -qiE "not approved|error|500"; then
    pass "Unvalidated startup blocked"
  else
    fail "Unvalidated startup allowed"
  fi
}

# ============================================================
# MAIN
# ============================================================

echo ""
echo "============================================"
echo " SINGLE CHANNEL FUNCTIONAL TEST SUITE"
echo "============================================"

> "$RESULTS_DIR/functional_results.csv"
echo "status,test_name" >> "$RESULTS_DIR/functional_results.csv"

setup
sleep 2

test_duplicate_registration
sleep 1
test_invalid_amount
sleep 1
test_reject_flow
sleep 1
test_dispute_flow
sleep 1
test_unvalidated_entity

echo ""
echo "============================================"
echo " FUNCTIONAL TEST SUMMARY"
echo "============================================"
echo " Total Tests : $TOTAL"
echo " Passed      : $PASS"
echo " Failed      : $FAIL"
echo " Pass Rate   : $(echo "scale=1; $PASS*100/$TOTAL" | bc)%"
echo "============================================"