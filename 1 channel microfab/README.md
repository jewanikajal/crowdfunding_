# CrowdChain Channel 1 - Microfab Single-Channel Crowdfunding Platform

A single-channel crowdfunding platform built on Hyperledger Fabric using Microfab.

- Channel: cip-main-channel
- Chaincode: cipcc (from [contracts/chaincode.go](contracts/chaincode.go))
- Organizations: StartupOrg, ValidatorOrg, InvestorOrg, PlatformOrg

---

## Prerequisites

| Tool         | Purpose                       | Install                               |
| :----------- | :---------------------------- | :------------------------------------ |
| Docker       | Runs Microfab                 | sudo apt install docker.io            |
| Node.js v18+ | Backend and frontend          | https://nodejs.org                    |
| Git          | Clone and version control     | sudo apt install git                  |
| weft         | Generate wallets/gateways/MSP | npm install -g @hyperledger-labs/weft |

---

## Phase 1 - Start Microfab

```bash
cd /home/supra/Desktop/Crowdfunding
export MICROFAB_CONFIG="$(cat MICROFAB.txt)"
docker run --rm --name microfab -e MICROFAB_CONFIG -p 9090:9090 ibmcom/ibp-microfab
```

---

## Phase 2 - Generate wallets, gateways, MSP

```bash
cd /home/supra/Desktop/Crowdfunding
curl -s http://console.127-0-0-1.nip.io:9090/ak/api/v1/components \
| weft microfab -w ./_wallets -p ./_gateways -m ./_msp -f
```

---

## Phase 3 - Deploy chaincode

Use the detailed steps in [RESTART_STEPS_CHANNEL1.md](RESTART_STEPS_CHANNEL1.md). In summary:

1. Package cipcc
2. Install cipcc for each org
3. Approve cipcc for each org
4. Commit cipcc on cip-main-channel

---

## Phase 4 - Start the web application

Backend:

```bash
cd /home/supra/Desktop/Crowdfunding/ui-channel1/backend
npm install
npm run start
```

Frontend:

```bash
cd /home/supra/Desktop/Crowdfunding/frontend
npm install
npm run dev
```

Open: http://localhost:5173

---

## Demo flow (end-to-end)

1. Register Startup
2. Validate Startup
3. Register Investor
4. Validate Investor
5. Create Project
6. Approve Project
7. Fund Project
8. Optional: Raise dispute, resolve dispute, refund, release funds

---

## Performance analysis

The platform includes a mixed-operation performance runner and a UI dashboard.

### Key files

| File                                       | Purpose                               |
| :----------------------------------------- | :------------------------------------ |
| ui-channel1/backend/perf/runPerf.js        | Performance runner (mixed ops)        |
| ui-channel1/backend/perf/perf-history.json | Stored results                        |
| frontend/src/App.jsx                       | Performance UI                        |
| ui-channel1/backend/app.js                 | /perf/history and /perf/run endpoints |

### What the benchmark does

Each chain runs a 7-step flow:

1. startup.register
2. startup.validate
3. investor.register
4. investor.validate
5. project.create
6. project.approve
7. fund

For 1000 tx, the runner executes 142 full chains (994 tx) plus 6 extra funding tx.

### Latest results

Run A (1000 tx, concurrency 8):

- Total: 1000
- Success: 1000
- Failed: 0
- Duration: 212,185 ms
- TPS: 4.71
- Latency: p50 1,682 ms, p95 2,272 ms

Run B (500 tx, concurrency 4):

- Total: 500
- Success: 500
- Failed: 0
- Duration: 94,059 ms
- TPS: 5.32
- Latency: p50 737 ms, p95 835 ms

### Run the test

Via UI: Performance tab -> Run 1000 Tx Test

Via CLI:

```bash
cd /home/supra/Desktop/Crowdfunding/ui-channel1/backend
TOTAL_TX=1000 CONCURRENCY=8 API_BASE=http://localhost:4000 node perf/runPerf.js
```

---

## PDC (Private Data Collections)

PDC configuration exists in [collections_config.json](collections_config.json). This defines private collections for each org and shared collections across org pairs. The config is present; chaincode usage of PutPrivateData/GetPrivateData can be added if required.

---

## Troubleshooting

| Problem                               | Fix                                                            |
| :------------------------------------ | :------------------------------------------------------------- |
| peer: command not found               | export PATH=$PATH:/home/supra/Desktop/Crowdfunding/bin         |
| Config File "core" Not Found          | export FABRIC_CFG_PATH=/home/supra/Desktop/Crowdfunding/config |
| No discovery results / cannot connect | Restart Microfab and regenerate wallets/gateways/MSP           |

---

## Runbooks

- [COOKBOOK_CHANNEL1.md](COOKBOOK_CHANNEL1.md)
- [RUN_LOG_CHANNEL1.md](RUN_LOG_CHANNEL1.md)
- [RESTART_STEPS_CHANNEL1.md](RESTART_STEPS_CHANNEL1.md)
