# Microfab Channel 1 Overview

This document summarizes what was implemented for the single-channel Microfab setup in this repo, what was achieved, and the latest performance results.

## 1) Scope and architecture

- Network: Microfab (single channel)
- Channel: cip-main-channel
- Chaincode: cipcc from [contracts/chaincode.go](contracts/chaincode.go)
- Orgs: StartupOrg, InvestorOrg, ValidatorOrg, PlatformOrg
- Gateways/Wallets/MSP generated with weft

## 2) What was completed

### Core blockchain flow

- Startup registration and validation
- Investor registration and validation
- Project creation and approval
- Funding transactions
- Settlement actions: release funds, refund, disputes

Chaincode functions are implemented in [contracts/chaincode.go](contracts/chaincode.go).

### Backend API (Channel 1)

- Node/Express backend in [ui-channel1/backend/app.js](ui-channel1/backend/app.js)
- REST endpoints used by the UI:
  - /startup/register, /startup/validate, /startup/:id
  - /investor/register, /investor/validate, /investor/:id
  - /project/create, /project/approve, /project/:id
  - /fund
  - /release, /refund, /dispute/raise, /dispute/resolve
  - /perf/history, /perf/run

### Frontend UI (React)

- React UI in [frontend/src/App.jsx](frontend/src/App.jsx)
- Sections: Overview, Startup, Investor, Project, Validator, Funding, Settlement, Performance
- Modal response viewer for every action
- Performance dashboard with charts, benchmark presets, and run history

### Performance testing

- Mixed-operation perf runner script in [ui-channel1/backend/perf/runPerf.js](ui-channel1/backend/perf/runPerf.js)
- Results stored in [ui-channel1/backend/perf/perf-history.json](ui-channel1/backend/perf/perf-history.json)
- UI pulls history via /perf/history and can trigger /perf/run

### Docs and runbooks

- Step-by-step cookbook: [COOKBOOK_CHANNEL1.md](COOKBOOK_CHANNEL1.md)
- Run log and fixes: [RUN_LOG_CHANNEL1.md](RUN_LOG_CHANNEL1.md)
- Post-reboot restart steps: [RESTART_STEPS_CHANNEL1.md](RESTART_STEPS_CHANNEL1.md)

## 3) PDC (Private Data Collections)

PDC config exists for Channel 1 in [collections_config.json](collections_config.json). This defines private collections for startups, investors, validators, platform, and shared scopes. The config is present, but chaincode usage of private data APIs should be verified if required by evaluation.

## 4) Performance results (latest)

These runs are from the stored perf history.

### Run A (1000 tx, concurrency 8, mixed flow)

- Total: 1000
- Success: 1000
- Failed: 0
- Duration: 212,185 ms
- TPS: 4.71
- Latency: p50 1,682 ms, p95 2,272 ms
- Chains: 142 (7 ops per chain)

### Run B (500 tx, concurrency 4, mixed flow)

- Total: 500
- Success: 500
- Failed: 0
- Duration: 94,059 ms
- TPS: 5.32
- Latency: p50 737 ms, p95 835 ms
- Chains: 71

Notes:

- The mixed flow includes startup/investor registration + validation, project create/approve, and funding.
- Performance depends on Microfab host load and current network state.

## 5) How to run (summary)

### Start Microfab

```bash
cd /home/supra/Desktop/Crowdfunding
export MICROFAB_CONFIG="$(cat MICROFAB.txt)"
docker run --rm --name microfab -e MICROFAB_CONFIG -p 9090:9090 ibmcom/ibp-microfab
```

### Generate wallets/gateways/MSP

```bash
cd /home/supra/Desktop/Crowdfunding
curl -s http://console.127-0-0-1.nip.io:9090/ak/api/v1/components \
| weft microfab -w ./_wallets -p ./_gateways -m ./_msp -f
```

### Start backend

```bash
cd /home/supra/Desktop/Crowdfunding/ui-channel1/backend
npm run start
```

### Start frontend

```bash
cd /home/supra/Desktop/Crowdfunding/frontend
npm run dev
```

### Run perf test (CLI)

```bash
cd /home/supra/Desktop/Crowdfunding/ui-channel1/backend
TOTAL_TX=1000 CONCURRENCY=8 API_BASE=http://localhost:4000 node perf/runPerf.js
```

## 6) Known limitations

- Privacy and security tests may fail because some PII is stored in public state and MSP role checks are not enforced (unless chaincode is updated).
- If Microfab restarts, wallets/gateways/MSP must be regenerated and chaincode approvals re-applied.

## 7) Next improvements (optional)

- Add private data usage in chaincode (PutPrivateData/GetPrivateData)
- Add more perf presets and exportable CSV reports
- Add error breakdown for failed transactions in perf runs
