# Microfab Single Channel Cookbook (Channel 1)

This cookbook is tailored to the Crowdfunding repo in this workspace and uses the repo's actual channel, chaincode, ports, and paths.

## 0) What this setup contains

- Channel: `cip-main-channel`
- Chaincode: `cipcc` (from `contracts/`)
- Orgs: StartupOrg, ValidatorOrg, InvestorOrg, PlatformOrg
- Network: Microfab on port 9090

## 1) Start Microfab (single channel)

Microfab config is already in `MICROFAB.txt`.

```bash
export MICROFAB_CONFIG="$(cat MICROFAB.txt)"
docker run --rm --name microfab -e MICROFAB_CONFIG -p 9090:9090 ibmcom/ibp-microfab
```

## 2) Generate wallets, gateways, and MSP

Run in a new terminal (keep Microfab running in the first one):

```bash
curl -s http://console.127-0-0-1.nip.io:9090/ak/api/v1/components \
| weft microfab -w ./_wallets -p ./_gateways -m ./_msp -f
```

This creates:

- `_wallets/`
- `_gateways/`
- `_msp/`

## 3) Install Fabric CLI binaries (one time)

```bash
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary
export PATH="$PATH:${PWD}/bin"
export FABRIC_CFG_PATH="${PWD}/config"
peer version
```

## 4) Set org environment (example: StartupOrg admin)

Use admin MSP, not CA admin MSP.

```bash
export CORE_PEER_LOCALMSPID=StartupOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/StartupOrg/startuporgadmin/msp
export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090
```

## 5) Package chaincode (cipcc)

```bash
peer lifecycle chaincode package cipcc.tar.gz \
  --path ./contracts \
  --lang golang \
  --label cipcc_1
```

## 6) Install chaincode

```bash
peer lifecycle chaincode install cipcc.tar.gz
peer lifecycle chaincode queryinstalled
```

Copy the `Package ID` from the output.

## 7) Approve chaincode for org

```bash
peer lifecycle chaincode approveformyorg \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  --package-id <PASTE_PACKAGE_ID>
```

## 8) Commit chaincode

```bash
peer lifecycle chaincode commit \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1
```

## 9) Quick verify (invoke + query)

```bash
peer chaincode invoke -C cip-main-channel -n cipcc \
  -c '{"function":"RegisterStartup","Args":["s1","TestStartup","s@x.com","PAN1","GST1","2022-01-01","fintech","product","India","MH","Pune","www.test.com","desc","2022","Founder"]}'

peer chaincode query -C cip-main-channel -n cipcc \
  -c '{"function":"GetStartup","Args":["s1"]}'
```

## 10) Run provided tests (already adjusted for Ubuntu + channel)

```bash
bash tests/test-functional.sh
bash tests/test-privacy.sh
bash tests/test-security.sh
```

## 11) What to submit/verify

You are done when:

- Microfab is running
- Chaincode installs and commits on `cip-main-channel`
- At least one invoke and query work
- Test scripts run with results saved under `tests/results/`
