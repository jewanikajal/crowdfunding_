#!/bin/bash
set -e
cd ~/cip-2-test

export PATH=$PATH:~/cip-2-test/bin
export FABRIC_CFG_PATH=$(pwd)/config
export CORE_PEER_TLS_ENABLED=false
export ORDERER=orderer-api.127-0-0-1.nip.io:9090

echo "=== Waiting for Microfab ==="
until curl -s http://localhost:9090/ak/api/v1/components > /dev/null 2>&1; do
  echo "  waiting..."; sleep 3
done
echo "  Microfab is up!"

echo "=== Refreshing MSP ==="
curl -s http://localhost:9090/ak/api/v1/components > microfab-components.json
rm -rf _msp
python3 << 'PYEOF'
import json, os, base64, stat
data = json.loads(open("microfab-components.json").read())
admin_map = {
    "StartupOrg":   "startuporgadmin",
    "ValidatorOrg": "validatororgadmin",
    "InvestorOrg":  "investororgadmin",
    "PlatformOrg":  "platformorgadmin",
    "Orderer":      "ordereradmin",
}
identities = {item["id"]: item for item in data if item.get("type") == "identity"}
for org, admin_id in admin_map.items():
    if admin_id not in identities:
        print(f"SKIP {org}")
        continue
    ident = identities[admin_id]
    cert  = base64.b64decode(ident["cert"]).decode()
    key   = base64.b64decode(ident["private_key"]).decode()
    ca    = base64.b64decode(ident["ca"]).decode()
    base = f"_msp/{org}/{admin_id}/msp"
    for d in ["cacerts", "keystore", "signcerts", "admincerts"]:
        os.makedirs(f"{base}/{d}", exist_ok=True)
    open(f"{base}/cacerts/ca.pem",      "w").write(ca)
    open(f"{base}/signcerts/cert.pem",  "w").write(cert)
    open(f"{base}/admincerts/cert.pem", "w").write(cert)
    keyfile = f"{base}/keystore/key.pem"
    open(keyfile, "w").write(key)
    os.chmod(keyfile, 0o600)
    open(f"{base}/config.yaml", "w").write("NodeOUs:\n  Enable: false\n")
    print(f"OK  {org}")
PYEOF

echo "=== Installing govcc ==="
for ORG in StartupOrg ValidatorOrg PlatformOrg; do
    ORG_LOWER=$(echo $ORG | tr '[:upper:]' '[:lower:]')
    export CORE_PEER_LOCALMSPID=${ORG}MSP
    export CORE_PEER_MSPCONFIGPATH=$(pwd)/_msp/${ORG}/${ORG_LOWER}admin/msp
    export CORE_PEER_ADDRESS=${ORG_LOWER}peer-api.127-0-0-1.nip.io:9090
    peer lifecycle chaincode install govcc.tar.gz 2>/dev/null && echo "  govcc -> $ORG OK"
done

echo "=== Installing investcc ==="
for ORG in StartupOrg ValidatorOrg InvestorOrg PlatformOrg; do
    ORG_LOWER=$(echo $ORG | tr '[:upper:]' '[:lower:]')
    export CORE_PEER_LOCALMSPID=${ORG}MSP
    export CORE_PEER_MSPCONFIGPATH=$(pwd)/_msp/${ORG}/${ORG_LOWER}admin/msp
    export CORE_PEER_ADDRESS=${ORG_LOWER}peer-api.127-0-0-1.nip.io:9090
    peer lifecycle chaincode install investcc.tar.gz 2>/dev/null && echo "  investcc -> $ORG OK"
done

echo "=== Getting Package IDs ==="
export CORE_PEER_LOCALMSPID=StartupOrgMSP
export CORE_PEER_MSPCONFIGPATH=$(pwd)/_msp/StartupOrg/startuporgadmin/msp
export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090

GOVCC_PKG_ID=$(peer lifecycle chaincode queryinstalled 2>/dev/null | grep govcc | awk '{print $3}' | tr -d ',')
INVESTCC_PKG_ID=$(peer lifecycle chaincode queryinstalled 2>/dev/null | grep investcc | awk '{print $3}' | tr -d ',')
echo "  govcc    : $GOVCC_PKG_ID"
echo "  investcc : $INVESTCC_PKG_ID"

echo "=== Approving govcc ==="
for ORG in StartupOrg ValidatorOrg PlatformOrg; do
    ORG_LOWER=$(echo $ORG | tr '[:upper:]' '[:lower:]')
    export CORE_PEER_LOCALMSPID=${ORG}MSP
    export CORE_PEER_MSPCONFIGPATH=$(pwd)/_msp/${ORG}/${ORG_LOWER}admin/msp
    export CORE_PEER_ADDRESS=${ORG_LOWER}peer-api.127-0-0-1.nip.io:9090
    peer lifecycle chaincode approveformyorg \
        -o $ORDERER -C gov-validation-channel -n govcc \
        --version 1.0 --sequence 1 \
        --package-id $GOVCC_PKG_ID 2>/dev/null && echo "  govcc approved for $ORG"
done

echo "=== Committing govcc ==="
export CORE_PEER_LOCALMSPID=StartupOrgMSP
export CORE_PEER_MSPCONFIGPATH=$(pwd)/_msp/StartupOrg/startuporgadmin/msp
export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090
peer lifecycle chaincode commit \
    -o $ORDERER -C gov-validation-channel -n govcc \
    --version 1.0 --sequence 1 \
    --peerAddresses startuporgpeer-api.127-0-0-1.nip.io:9090 \
    --peerAddresses validatororgpeer-api.127-0-0-1.nip.io:9090 \
    --peerAddresses platformorgpeer-api.127-0-0-1.nip.io:9090 \
    && echo "  govcc committed OK"

echo "=== Approving investcc ==="
for ORG in StartupOrg ValidatorOrg InvestorOrg PlatformOrg; do
    ORG_LOWER=$(echo $ORG | tr '[:upper:]' '[:lower:]')
    export CORE_PEER_LOCALMSPID=${ORG}MSP
    export CORE_PEER_MSPCONFIGPATH=$(pwd)/_msp/${ORG}/${ORG_LOWER}admin/msp
    export CORE_PEER_ADDRESS=${ORG_LOWER}peer-api.127-0-0-1.nip.io:9090
    peer lifecycle chaincode approveformyorg \
        -o $ORDERER -C investment-channel -n investcc \
        --version 1.0 --sequence 1 \
        --package-id $INVESTCC_PKG_ID 2>/dev/null && echo "  investcc approved for $ORG"
done

echo "=== Committing investcc ==="
export CORE_PEER_LOCALMSPID=StartupOrgMSP
export CORE_PEER_MSPCONFIGPATH=$(pwd)/_msp/StartupOrg/startuporgadmin/msp
export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090
peer lifecycle chaincode commit \
    -o $ORDERER -C investment-channel -n investcc \
    --version 1.0 --sequence 1 \
    --peerAddresses startuporgpeer-api.127-0-0-1.nip.io:9090 \
    --peerAddresses validatororgpeer-api.127-0-0-1.nip.io:9090 \
    --peerAddresses investororgpeer-api.127-0-0-1.nip.io:9090 \
    --peerAddresses platformorgpeer-api.127-0-0-1.nip.io:9090 \
    && echo "  investcc committed OK"

echo ""
echo "=== ALL DONE — Ready to run tests ==="
