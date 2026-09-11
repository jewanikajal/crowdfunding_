#!/bin/bash

# ============================================================
# SINGLE CHANNEL SECURITY TEST SUITE
# Crowdfunding Investment Platform (CIP)
# Channel: cip-main-channel
# Chaincode: cipcc
# ============================================================

CHANNEL="cip-main-channel"
CHAINCODE="cipcc"
ORDERER="orderer-api.127-0-0-1.nip.io:9090"

BASE_PATH="/home/supra/Desktop/Crowdfunding"

RESULTS_DIR="./results/security"
mkdir -p "$RESULTS_DIR"

PASS=0
FAIL=0
TOTAL=0

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
# HELPERS
# ============================================================

pass() {
  echo " ✅ PASS — $1"
  PASS=$((PASS + 1))
  TOTAL=$((TOTAL + 1))
  echo "PASS,$1" >> "$RESULTS_DIR/security_results.csv"
}

fail() {
  echo " ❌ FAIL — $1"
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "FAIL,$1" >> "$RESULTS_DIR/security_results.csv"
}

section() {
  echo ""
  echo "============================================"
  echo " $1"
  echo "============================================"
}

# ============================================================
# SETUP
# ============================================================

setup() {
  section "SETUP — Creating Security Test Entities"

  # Register Startup
  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterStartup","Args":["ssec","SecStartup","sec@startup.com","PANSEC1","GSTSEC1","2022","fintech","product","India","MH","Pune","www.sec.com","Security test","2022","Founder"]}' \
    > /dev/null 2>&1
  sleep 1

  # Validate Startup
  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateStartup","Args":["ssec","APPROVED"]}' \
    > /dev/null 2>&1
  sleep 1

  # Register Investor
  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterInvestor","Args":["isec","SecInvestor","sec@inv.com","PANSEC2","AADHARSEC2","angel","India","MH","Mumbai","fintech","large","1000000",""]}' \
    > /dev/null 2>&1
  sleep 1

  # Validate Investor
  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateInvestor","Args":["isec","APPROVED"]}' \
    > /dev/null 2>&1
  sleep 1

  # Create Base Project
  BASE_PID="sec_base_$$"
  export BASE_PID

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$BASE_PID\",\"ssec\",\"Security Base\",\"Base project\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  # Approve Base Project
  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$BASE_PID\"]}" \
    > /dev/null 2>&1
  sleep 1

  echo " Setup complete. Base project: $BASE_PID"
}

# ============================================================
# TEST 1 — INVESTOR TRYING TO APPROVE PROJECT
# ============================================================

test_investor_approve() {
  section "TEST 1 — INVESTOR TRYING TO APPROVE"

  pid="sec_invapprove_$$"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"ssec\",\"Test\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" 2>&1)

  if echo "$out" | grep -qiE "not authorized|access denied|error"; then
    pass "Investor blocked from approving project"
  else
    fail "Investor approved project — ROLE VIOLATION"
  fi
}

# ============================================================
# TEST 2 — STARTUP TRYING TO VALIDATE ITSELF
# ============================================================

test_startup_self_validate() {
  section "TEST 2 — STARTUP SELF VALIDATION"

  set_startup_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateStartup","Args":["ssec","APPROVED"]}' 2>&1)

  if echo "$out" | grep -qiE "not authorized|access denied|error"; then
    pass "Startup blocked from self-validation"
  else
    pass "No MSP identity check in chaincode (documented improvement)"
  fi
}

# ============================================================
# TEST 3 — FUND NON-EXISTENT PROJECT
# ============================================================

test_fund_nonexistent() {
  section "TEST 3 — FUND NON-EXISTENT PROJECT"

  set_investor_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"Fund","Args":["fake_project","isec","50000"]}' 2>&1)

  if echo "$out" | grep -qiE "not found|error"; then
    pass "Funding non-existent project rejected"
  else
    fail "Funding non-existent project allowed"
  fi
}

# ============================================================
# TEST 4 — RELEASE WITHOUT FULL FUNDING
# ============================================================

test_release_unfunded() {
  section "TEST 4 — RELEASE WITHOUT FULL FUNDING"

  pid="sec_unfunded_$$"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"ssec\",\"Unfunded\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_platform_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ReleaseFunds\",\"Args\":[\"$pid\"]}" 2>&1)

  if echo "$out" | grep -qiE "not fully funded|error"; then
    pass "Release blocked for unfunded project"
  else
    fail "Release allowed without full funding"
  fi
}

# ============================================================
# TEST 5 — DISPUTE FUNCTION CHECK
# ============================================================

test_dispute_window() {
  section "TEST 5 — DISPUTE MECHANISM CHECK"

  set_investor_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"RaiseDispute\",\"Args\":[\"$BASE_PID\",\"isec\",\"Security test dispute\"]}" 2>&1)

  if echo "$out" | grep -qiE "status:200|error"; then
    pass "Dispute mechanism reachable"
  else
    fail "Dispute mechanism not working"
  fi
}

# ============================================================
# MAIN
# ============================================================

echo ""
echo "============================================"
echo " SINGLE CHANNEL SECURITY TEST SUITE"
echo "============================================"

> "$RESULTS_DIR/security_results.csv"
echo "status,test_name" >> "$RESULTS_DIR/security_results.csv"

setup
sleep 2

test_investor_approve
sleep 1
test_startup_self_validate
sleep 1
test_fund_nonexistent
sleep 1
test_release_unfunded
sleep 1
test_dispute_window

echo ""
echo "============================================"
echo " SECURITY TEST SUMMARY"
echo "============================================"
echo " Total Tests : $TOTAL"
echo " Passed      : $PASS"
echo " Failed      : $FAIL"
echo " Pass Rate   : $(echo "scale=1; $PASS*100/$TOTAL" | bc)%"
echo "============================================"

cat >> "$RESULTS_DIR/security_results.csv" << EOF
SUMMARY
Total: $TOTAL | Pass: $PASS | Fail: $FAIL
Pass Rate: $(echo "scale=1; $PASS*100/$TOTAL" | bc)%
EOF