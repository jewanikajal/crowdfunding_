# Startup Instructions (Single-Channel Crowdfunding)

This guide reflects the working setup validated in this repository.

## 1) Prerequisites

Run all Fabric commands from WSL Ubuntu (recommended), not native Windows shells.

Required tools:
- Docker Desktop running, with WSL integration enabled for Ubuntu
- `go` installed in WSL (required for chaincode packaging flow)
- `curl`, `jq`, `bash`

Required Docker image:
- `hyperledger/fabric-ccenv:3.1`

Pull it once if missing:

```bash
docker pull hyperledger/fabric-ccenv:3.1
```

## 2) Repository Root

From WSL:

```bash
cd /mnt/c/Users/siddi/fabric-crowdfunding-network
```

## 3) Bring Up the Network

```bash
./network.sh up createChannel -ca -s couchdb
```

If the script asks about cleanup/recreate, allow it.

## 4) Deploy Crowdfunding Chaincode

This repo uses the local chaincode path below.

```bash
./network.sh deployCC \
  -ccn crowdfund \
  -ccp ./crowdfund-chaincode \
  -ccl go \
  -ccv 1 \
  -ccs 1 \
  -c mychannel
```

## 5) Run End-to-End Test Suite (1 to 8)

```bash
./test_1_register_startup.sh
./test_2_validate_startup.sh
./test_3_register_investor.sh
./test_4_validate_investor.sh
./test_5_create_project.sh
./test_6_approve_project.sh
./test_7_fund_project.sh
./test_8_release_funds.sh
```

Or one-liner:

```bash
./test_1_register_startup.sh; ./test_2_validate_startup.sh; ./test_3_register_investor.sh; ./test_4_validate_investor.sh; ./test_5_create_project.sh; ./test_6_approve_project.sh; ./test_7_fund_project.sh; ./test_8_release_funds.sh
```

## 6) Expected Result

- The full sequence completes successfully.
- If test 1 reports a duplicate startup ID in repeated runs, it is usually ledger data reuse (for example `S100` already exists).

## 7) Clean Reset (If You Need a Fresh Ledger)

```bash
./network.sh down
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn crowdfund -ccp ./crowdfund-chaincode -ccl go -ccv 1 -ccs 1 -c mychannel
```

Then rerun tests.

## 8) Useful Notes

- Test scripts were updated to include required runtime env setup (`PATH`, `FABRIC_CFG_PATH`, `CORE_PEER_TLS_ENABLED=true`).
- Keep commands in WSL for consistent binary and path behavior.
