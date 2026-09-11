# Channel 1 Restart Steps (Copy/Paste)

Use this after a reboot. It starts Microfab, recreates wallets/MSP, installs and commits chaincode, then runs tests.

## 1) Start Docker

```bash
sudo systemctl start docker
```

## 2) Start Microfab (keep this terminal open)

```bash
cd /home/supra/Desktop/Crowdfunding
export MICROFAB_CONFIG="$(cat MICROFAB.txt)"
docker run --rm --name microfab -e MICROFAB_CONFIG -p 9090:9090 ibmcom/ibp-microfab
```

## 3) Generate wallets/MSP (new terminal)

```bash
cd /home/supra/Desktop/Crowdfunding
curl -s http://console.127-0-0-1.nip.io:9090/ak/api/v1/components \
| weft microfab -w ./_wallets -p ./_gateways -m ./_msp -f
```

## 4) Set CLI env (same terminal as chaincode commands)

```bash
export PATH="$PATH:/home/supra/Desktop/Crowdfunding/bin"
export FABRIC_CFG_PATH="/home/supra/Desktop/Crowdfunding/config"
export CORE_PEER_TLS_ENABLED=false
```

## 5) StartupOrg: package + install + approve + commit

```bash
export CORE_PEER_LOCALMSPID=StartupOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/StartupOrg/startuporgadmin/msp
export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090

peer lifecycle chaincode package cipcc.tar.gz \
  --path ./contracts \
  --lang golang \
  --label cipcc_1

peer lifecycle chaincode install cipcc.tar.gz
peer lifecycle chaincode queryinstalled
```

Copy the Package ID shown, then:

```bash
peer lifecycle chaincode approveformyorg \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  --package-id <PASTE_PACKAGE_ID>

peer lifecycle chaincode commit \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  -o orderer-api.127-0-0-1.nip.io:9090
```

## 6) ValidatorOrg: install + approve

```bash
export CORE_PEER_LOCALMSPID=ValidatorOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/ValidatorOrg/validatororgadmin/msp
export CORE_PEER_ADDRESS=validatororgpeer-api.127-0-0-1.nip.io:9090

peer lifecycle chaincode install cipcc.tar.gz

peer lifecycle chaincode approveformyorg \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  --package-id <PASTE_PACKAGE_ID>
```

## 7) InvestorOrg: install + approve

```bash
export CORE_PEER_LOCALMSPID=InvestorOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/InvestorOrg/investororgadmin/msp
export CORE_PEER_ADDRESS=investororgpeer-api.127-0-0-1.nip.io:9090

peer lifecycle chaincode install cipcc.tar.gz

peer lifecycle chaincode approveformyorg \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  --package-id <PASTE_PACKAGE_ID>
```

## 8) PlatformOrg: install + approve

```bash
export CORE_PEER_LOCALMSPID=PlatformOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/PlatformOrg/platformorgadmin/msp
export CORE_PEER_ADDRESS=platformorgpeer-api.127-0-0-1.nip.io:9090

peer lifecycle chaincode install cipcc.tar.gz

peer lifecycle chaincode approveformyorg \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  --package-id <PASTE_PACKAGE_ID>
```

## 9) Run tests

```bash
bash tests/test-functional.sh
bash tests/test-privacy.sh
bash tests/test-security.sh
```

Notes:

- If privacy/security tests fail, it is due to current chaincode logic (PII stored in public state + no MSP role checks). This is expected unless the chaincode is changed.
