# Channel 1 Run Log (Microfab)

This file records what we actually ran, in order, plus the fixes we made so you can replay or explain it later.

## 1) Start Docker and Microfab

```bash
# Start Docker (if needed)
sudo systemctl start docker
sudo systemctl enable docker

# Start Microfab (keep this terminal open)
export MICROFAB_CONFIG="$(cat MICROFAB.txt)"
docker run --rm --name microfab -e MICROFAB_CONFIG -p 9090:9090 ibmcom/ibp-microfab
```

## 2) Generate wallets, gateways, MSP

```bash
# First attempt failed because weft was missing
curl -s http://console.127-0-0-1.nip.io:9090/ak/api/v1/components \
| weft microfab -w ./_wallets -p ./_gateways -m ./_msp -f
```

### Fix: install weft (required by Microfab)

```bash
npm install -g @hyperledger-labs/weft
```

### Re-run and confirm output

```bash
curl -s http://console.127-0-0-1.nip.io:9090/ak/api/v1/components \
| weft microfab -w ./_wallets -p ./_gateways -m ./_msp -f
```

Result:

- `_wallets/`, `_gateways/`, `_msp/` created
- Environment variable snippets printed for each org

## 3) Install Fabric CLI (peer)

```bash
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary
export PATH="$PATH:${PWD}/bin"
export FABRIC_CFG_PATH="${PWD}/config"
peer version
```

## 4) Set org environment (StartupOrg admin)

```bash
export CORE_PEER_TLS_ENABLED=false
export CORE_PEER_LOCALMSPID=StartupOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/StartupOrg/startuporgadmin/msp
export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090
```

## 5) Chaincode packaging and install (initial failures)

Initial error from Microfab logs:

- `invalid go version '1.21.6': must match format 1.23`

### Fix 1: go.mod version format

- Changed `go 1.21.6` -> `go 1.21` in [contracts/go.mod](contracts/go.mod)

Then build still failed with:

- `undefined: any` and `module requires Go 1.19`

### Fix 2: downgrade module + pin deps for older Go

- Changed `go 1.17`
- Changed `github.com/hyperledger/fabric-contract-api-go` to `v1.1.0`
- Added `replace` pins for older versions of grpc/protobuf/genproto and go-openapi libs
- Added genproto disambiguation for `google.golang.org/genproto/googleapis/rpc`

Commands used after the change:

```bash
cd /home/supra/Desktop/Crowdfunding/contracts
go mod tidy -compat=1.17
go mod vendor
```

## 6) Package, install, and get Package ID

```bash
export PATH="$PATH:/home/supra/Desktop/Crowdfunding/bin"
export FABRIC_CFG_PATH="/home/supra/Desktop/Crowdfunding/config"
export CORE_PEER_TLS_ENABLED=false
export CORE_PEER_LOCALMSPID=StartupOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/StartupOrg/startuporgadmin/msp
export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090

cd /home/supra/Desktop/Crowdfunding
peer lifecycle chaincode package cipcc.tar.gz --path ./contracts --lang golang --label cipcc_1
peer lifecycle chaincode install cipcc.tar.gz
peer lifecycle chaincode queryinstalled
```

Package ID:

- `cipcc_1:1ed4d31ccf72e56df9cc02e14639095df47cdbcc47328e7f385b6343320227b5`

## 7) Approve and commit (success)

```bash
peer lifecycle chaincode approveformyorg \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  --package-id cipcc_1:1ed4d31ccf72e56df9cc02e14639095df47cdbcc47328e7f385b6343320227b5

peer lifecycle chaincode commit \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1
```

## 7b) Approve + install for all orgs (required for endorsements)

Each org must approve and install the chaincode locally to endorse transactions.

```bash
export PATH="$PATH:/home/supra/Desktop/Crowdfunding/bin"
export FABRIC_CFG_PATH="/home/supra/Desktop/Crowdfunding/config"
export CORE_PEER_TLS_ENABLED=false

# ValidatorOrg approve + install
export CORE_PEER_LOCALMSPID=ValidatorOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/ValidatorOrg/validatororgadmin/msp
export CORE_PEER_ADDRESS=validatororgpeer-api.127-0-0-1.nip.io:9090
peer lifecycle chaincode approveformyorg \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  --package-id cipcc_1:1ed4d31ccf72e56df9cc02e14639095df47cdbcc47328e7f385b6343320227b5
peer lifecycle chaincode install cipcc.tar.gz

# InvestorOrg approve + install
export CORE_PEER_LOCALMSPID=InvestorOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/InvestorOrg/investororgadmin/msp
export CORE_PEER_ADDRESS=investororgpeer-api.127-0-0-1.nip.io:9090
peer lifecycle chaincode approveformyorg \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  --package-id cipcc_1:1ed4d31ccf72e56df9cc02e14639095df47cdbcc47328e7f385b6343320227b5
peer lifecycle chaincode install cipcc.tar.gz

# PlatformOrg approve + install
export CORE_PEER_LOCALMSPID=PlatformOrgMSP
export CORE_PEER_MSPCONFIGPATH=/home/supra/Desktop/Crowdfunding/_msp/PlatformOrg/platformorgadmin/msp
export CORE_PEER_ADDRESS=platformorgpeer-api.127-0-0-1.nip.io:9090
peer lifecycle chaincode approveformyorg \
  --channelID cip-main-channel \
  --name cipcc \
  --version 1.0 \
  --sequence 1 \
  --package-id cipcc_1:1ed4d31ccf72e56df9cc02e14639095df47cdbcc47328e7f385b6343320227b5
peer lifecycle chaincode install cipcc.tar.gz
```

## 8) Next verification step (pending)

Run one invoke and one query to show the chaincode works:

```bash
peer chaincode invoke -C cip-main-channel -n cipcc \
  -c '{"function":"RegisterStartup","Args":["s1","TestStartup","s@x.com","PAN1","GST1","2022-01-01","fintech","product","India","MH","Pune","www.test.com","desc","2022","Founder"]}'

peer chaincode query -C cip-main-channel -n cipcc \
  -c '{"function":"GetStartup","Args":["s1"]}'
```

Result:

- Invoke success (status 200)
- Query returned Startup `s1` with status `PENDING`

If these work, we can run the test scripts:

```bash
bash tests/test-functional.sh
bash tests/test-privacy.sh
bash tests/test-security.sh
```

## 9) Test results (detailed)

### 9.1 Functional test (PASS)

Command:

```bash
bash tests/test-functional.sh
```

Output (summary):

- Duplicate registration: PASS
- Invalid fund amount: PASS
- Project reject flow: PASS
- Dispute flow: PASS
- Unvalidated startup: PASS
- Total: 6/6, Pass Rate 100.0%

### 9.2 Privacy test (FAIL)

Command:

```bash
bash tests/test-privacy.sh
```

Output (summary):

- Public state data leakage: FAIL (Aadhar leaked, PAN leaked)
- PDC isolation: PASS
- Org role boundary: FAIL (startup sees investor financial data)
- Approval integrity: PASS
- Total: 2/5, Pass Rate 40.0%

Failure reasons (code logic):

- `RegisterInvestor` writes PAN/Aadhar directly to public world state, so privacy test detects leakage.
- `GetInvestor` returns full investor data without checking caller org/role, so startup can read investor financial fields.

### 9.3 Security test (FAIL)

Command:

```bash
bash tests/test-security.sh
```

Output (summary):

- Investor trying to approve: FAIL (role violation)
- Startup self validation: PASS
- Fund non-existent project: PASS
- Release without full funding: PASS
- Dispute mechanism check: PASS
- Total: 4/5, Pass Rate 80.0%

Failure reason (code logic):

- `ApproveProject` has no MSP/role check, so an Investor org can approve projects. This triggers the role-violation failure.

Functional test status:

- PASS (6/6)

Functional test output (summary):

- Duplicate registration: PASS
- Invalid fund amount: PASS
- Project reject flow: PASS
- Dispute flow: PASS
- Unvalidated startup: PASS
- Total: 6/6, Pass Rate 100.0%

Privacy test status:

- FAIL (2/5)

Privacy test output (summary):

- Public state data leakage: FAIL (Aadhar, PAN)
- PDC isolation: PASS
- Org role boundary: FAIL (startup sees investor financial data)
- Approval integrity: PASS
- Total: 2/5, Pass Rate 40.0%

Security test status:

- FAIL (4/5)

Security test output (summary):

- Investor trying to approve: FAIL (role violation)
- Startup self validation: PASS
- Fund non-existent project: PASS
- Release without full funding: PASS
- Dispute mechanism check: PASS
- Total: 4/5, Pass Rate 80.0%
