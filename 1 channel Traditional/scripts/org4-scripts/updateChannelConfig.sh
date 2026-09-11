#!/usr/bin/env bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# This script is designed to be run by addOrg4.sh as the
# first step of the Adding an Org to a Channel tutorial.
# It creates and submits a configuration transaction to
# add org4 to the test network

CHANNEL_NAME="$1"
DELAY="$2"
TIMEOUT="$3"
VERBOSE="$4"
: ${CHANNEL_NAME:="mychannel"}
: ${DELAY:="3"}
: ${TIMEOUT:="10"}
: ${VERBOSE:="false"}
COUNTER=1
MAX_RETRY=5


# imports
# test network home var targets to test-network folder
# the reason we use a var here is considering with org4 specific folder
# when invoking this for org4 as test-network/scripts/org4-scripts
# the value is changed from default as $PWD (test-network)
# to ${PWD}/.. to make the import works
export TEST_NETWORK_HOME="${PWD}/.."
. ${TEST_NETWORK_HOME}/scripts/configUpdate.sh 

infoln "Creating config transaction to add org4 to network"

# Fetch the config for the channel, writing it to config.json
fetchChannelConfig 1 ${CHANNEL_NAME} ${TEST_NETWORK_HOME}/channel-artifacts/config.json

# Ensure Org4 MSP includes an explicit admin cert for policy evaluation.
ORG4_JSON_SRC=${TEST_NETWORK_HOME}/organizations/peerOrganizations/org4.example.com/org4.json
ORG4_JSON_EFFECTIVE=${ORG4_JSON_SRC}
ORG4_ADMIN_CERT_PATH=${TEST_NETWORK_HOME}/organizations/peerOrganizations/org4.example.com/users/Admin@org4.example.com/msp/signcerts/cert.pem
if [ ! -f "${ORG4_ADMIN_CERT_PATH}" ]; then
	ORG4_ADMIN_CERT_PATH=$(ls ${TEST_NETWORK_HOME}/organizations/peerOrganizations/org4.example.com/users/Admin@org4.example.com/msp/signcerts/*.pem 2>/dev/null | head -n 1)
fi
if [ -z "${ORG4_ADMIN_CERT_PATH}" ] || [ ! -f "${ORG4_ADMIN_CERT_PATH}" ]; then
	ORG4_ADMIN_CERT_PATH=$(ls ${TEST_NETWORK_HOME}/organizations/peerOrganizations/org4.example.com/users/Admin@org4.example.com/msp/admincerts/*.pem 2>/dev/null | head -n 1)
fi

if [ -f "${ORG4_ADMIN_CERT_PATH}" ]; then
	ORG4_ADMIN_CERT=$(base64 -w 0 "${ORG4_ADMIN_CERT_PATH}")
	set -x
	jq --arg admincert "$ORG4_ADMIN_CERT" '.values.MSP.value.config.admins = [$admincert]' ${ORG4_JSON_SRC} > ${TEST_NETWORK_HOME}/channel-artifacts/org4_with_admin.json
	{ set +x; } 2>/dev/null
	ORG4_JSON_EFFECTIVE=${TEST_NETWORK_HOME}/channel-artifacts/org4_with_admin.json
fi

# Modify the configuration to append the new org
set -x
jq -s '.[0] * {"channel_group":{"groups":{"Application":{"groups": {"Org4MSP":.[1]}}}}}' ${TEST_NETWORK_HOME}/channel-artifacts/config.json ${ORG4_JSON_EFFECTIVE} > ${TEST_NETWORK_HOME}/channel-artifacts/modified_config.json
{ set +x; } 2>/dev/null

# Compute a config update, based on the differences between config.json and modified_config.json, write it as a transaction to org4_update_in_envelope.pb
createConfigUpdate ${CHANNEL_NAME} ${TEST_NETWORK_HOME}/channel-artifacts/config.json ${TEST_NETWORK_HOME}/channel-artifacts/modified_config.json ${TEST_NETWORK_HOME}/channel-artifacts/org4_update_in_envelope.pb

infoln "Signing config transaction"
signConfigtxAsPeerOrg 1 ${TEST_NETWORK_HOME}/channel-artifacts/org4_update_in_envelope.pb
infoln "Signing config transaction as Org4 admin"
signConfigtxAsPeerOrg 4 ${TEST_NETWORK_HOME}/channel-artifacts/org4_update_in_envelope.pb
infoln "Signing config transaction as Org2 admin"
signConfigtxAsPeerOrg 2 ${TEST_NETWORK_HOME}/channel-artifacts/org4_update_in_envelope.pb

infoln "Submitting transaction from a different peer (peer0.org2) which also signs it"
setGlobals 2
set -x
peer channel update -f ${TEST_NETWORK_HOME}/channel-artifacts/org4_update_in_envelope.pb -c ${CHANNEL_NAME} -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA"
{ set +x; } 2>/dev/null

successln "Config transaction to add org4 to network submitted"
