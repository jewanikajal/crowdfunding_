#!/bin/bash

# ============================================================
# SINGLE CHANNEL PRIVACY TEST SUITE (PDC Based)
# Crowdfunding Investment Platform (CIP)
# Channel: cip-main-channel
# Chaincode: cipcc
# ============================================================

CHANNEL="cip-main-channel"
CHAINCODE="cipcc"
ORDERER="orderer-api.127-0-0-1.nip.io:9090"

BASE_PATH="/home/supra/Desktop/Crowdfunding"

RESULTS_DIR="./results/privacy"
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
  echo "PASS,$1" >> "$RESULTS_DIR/privacy_results.csv"
}

fail() {
  echo " ❌ FAIL — $1"
  FAIL=$((FAIL + 1))
  TOTAL=$((TOTAL + 1))
  echo "FAIL,$1" >> "$RESULTS_DIR/privacy_results.csv"
}

section() {
  echo ""
  echo "============================================"
  echo " $1"
  echo "============================================"
}

# ============================================================
# SETUP — Register validated entities
# ============================================================

setup() {
  section "SETUP — Creating Private Test Entities"

  # Startup
  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterStartup","Args":["spriv","PrivStartup","priv@startup.com","PANPRIV1","GSTPRIV1","2022","fintech","product","India","MH","Pune","www.priv.com","Privacy test","2022","Founder"]}' \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateStartup","Args":["spriv","APPROVED"]}' \
    > /dev/null 2>&1
  sleep 1

  # Investor
  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"RegisterInvestor","Args":["ipriv","PrivInvestor","priv@inv.com","PANPRIV2","AADHARPRIV2","angel","India","MH","Mumbai","fintech","large","1000000",""]}' \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"ValidateInvestor","Args":["ipriv","APPROVED"]}' \
    > /dev/null 2>&1
  sleep 1

  echo " Setup complete."
}

# ============================================================
# TEST 1 — PUBLIC STATE DATA LEAKAGE
# ============================================================

test_public_data_leakage() {
  section "TEST 1 — PUBLIC STATE DATA LEAKAGE"

  set_startup_env
  out=$(peer chaincode query -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"GetInvestor","Args":["ipriv"]}' 2>&1)

  if echo "$out" | grep -q "AADHARPRIV2"; then
    fail "Aadhar leaked in public ledger"
  else
    pass "Sensitive Aadhar not exposed publicly"
  fi

  set_investor_env
  out=$(peer chaincode query -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"GetStartup","Args":["spriv"]}' 2>&1)

  if echo "$out" | grep -q "PANPRIV1"; then
    fail "PAN leaked in public ledger"
  else
    pass "Sensitive PAN not exposed publicly"
  fi
}

# ============================================================
# TEST 2 — PDC ISOLATION
# ============================================================

test_pdc_isolation() {
  section "TEST 2 — PDC ISOLATION"

  set_startup_env
  out=$(peer chaincode query -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"GetPrivateInvestorData","Args":["ipriv"]}' 2>&1)

  if echo "$out" | grep -qiE "access denied|private data not available|error"; then
    pass "Startup cannot access Investor private data"
  else
    fail "Startup accessed Investor private data"
  fi
}

# ============================================================
# TEST 3 — ORG ROLE BOUNDARY
# ============================================================

test_org_boundary() {
  section "TEST 3 — ORG ROLE BOUNDARY"

  pid="priv_proj_$$"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"spriv\",\"BoundaryTest\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_validator_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"ApproveProject\",\"Args\":[\"$pid\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"Fund\",\"Args\":[\"$pid\",\"ipriv\",\"50000\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_startup_env
  out=$(peer chaincode query -C "$CHANNEL" -n "$CHAINCODE" \
    -c '{"function":"GetInvestor","Args":["ipriv"]}' 2>&1)

  if echo "$out" | grep -q "annualIncome"; then
    fail "Startup sees investor financial data"
  else
    pass "Startup cannot see investor financial data"
  fi
}

# ============================================================
# TEST 4 — APPROVAL INTEGRITY
# ============================================================

test_approval_integrity() {
  section "TEST 4 — APPROVAL INTEGRITY"

  pid="priv_hash_$$"

  set_startup_env
  peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"CreateProject\",\"Args\":[\"$pid\",\"spriv\",\"HashTest\",\"Test\",\"100000\",\"30\",\"fintech\",\"equity\",\"India\",\"SMEs\",\"mvp\"]}" \
    > /dev/null 2>&1
  sleep 1

  set_investor_env
  out=$(peer chaincode invoke -o "$ORDERER" -C "$CHANNEL" -n "$CHAINCODE" \
    -c "{\"function\":\"Fund\",\"Args\":[\"$pid\",\"ipriv\",\"50000\"]}" 2>&1)

  if echo "$out" | grep -qiE "not approved|error"; then
    pass "Funding unapproved project rejected"
  else
    fail "Unapproved project funded"
  fi
}

# ============================================================
# MAIN
# ============================================================

echo ""
echo "============================================"
echo " SINGLE CHANNEL PRIVACY TEST SUITE"
echo "============================================"

> "$RESULTS_DIR/privacy_results.csv"
echo "status,test_name" >> "$RESULTS_DIR/privacy_results.csv"

setup
sleep 2

test_public_data_leakage
sleep 1
test_pdc_isolation
sleep 1
test_org_boundary
sleep 1
test_approval_integrity

echo ""
echo "============================================"
echo " PRIVACY TEST SUMMARY"
echo "============================================"
echo " Total Tests : $TOTAL"
echo " Passed      : $PASS"
echo " Failed      : $FAIL"
echo " Pass Rate   : $(echo "scale=1; $PASS*100/$TOTAL" | bc)%"
echo "============================================"