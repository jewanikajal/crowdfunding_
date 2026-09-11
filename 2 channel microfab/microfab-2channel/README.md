# CrowdChain — Dual-Channel Hyperledger Fabric Crowdfunding Platform

A blockchain-based crowdfunding platform built on Hyperledger Fabric with two isolated channels:
- **`gov-validation-channel`** — Startup & investor KYC, government approvals
- **`investment-channel`** — Project funding, disputes, and fund releases

**4 Organizations:** StartupOrg · ValidatorOrg · InvestorOrg · PlatformOrg

---

## Prerequisites

| Tool | Purpose | Install |
| :--- | :--- | :--- |
| **Docker** | Runs the Blockchain Network | `sudo apt install docker.io` |
| **Node.js v18+** | Backend & Frontend | [nodejs.org](https://nodejs.org) |
| **Python 3** | MSP credential extraction | `sudo apt install python3` |
| **Git** | Clone the project | `sudo apt install git` |

> **`weft` is NOT required.**

---

## Phase 0 — Get the Project (First Time Only)

```bash
git clone https://github.com/Unyc1124/cip-2-test.git
cd cip-2-test

# Add Fabric binaries to PATH (adjust path to your actual directory)
export PROJECT_DIR=$(pwd)
echo "export PATH=\$PATH:\$PROJECT_DIR/bin" >> ~/.bashrc
source ~/.bashrc

# Verify
peer version   # Expected: Version: v2.5.x
```

---

## Phase 1 — Start the Blockchain Network

**First time only — create and launch the container:**
```bash
docker run -d --name microfab -p 9090:9090 \
  -e MICROFAB_CONFIG='{"port":9090,"endorsing_organizations":[{"name":"StartupOrg","peers":[{"name":"peer0","stateDatabase":"couchdb"}]},{"name":"ValidatorOrg","peers":[{"name":"peer0","stateDatabase":"couchdb"}]},{"name":"InvestorOrg","peers":[{"name":"peer0","stateDatabase":"couchdb"}]},{"name":"PlatformOrg","peers":[{"name":"peer0","stateDatabase":"couchdb"}]}],"channels":[{"name":"gov-validation-channel","endorsing_organizations":["StartupOrg","ValidatorOrg","PlatformOrg"]},{"name":"investment-channel","endorsing_organizations":["StartupOrg","ValidatorOrg","InvestorOrg","PlatformOrg"]}]}' \
  ibmcom/ibp-microfab
sleep 20
```

> **On every subsequent restart:** `docker start microfab`

**Verify:**
```bash
curl -s http://localhost:9090/ak/api/v1/components | python3 -m json.tool | head -5
```

---

## Phase 2 — Deploy Chaincodes (Smart Contracts)

```bash
# Navigate to your project directory
cd /path/to/your/project  # or use: cd "$(dirname "$0")"
./redeploy.sh
```

This automatically:
1. Downloads identity certificates from Microfab
2. Creates `_msp/` folders with credentials for all 4 orgs
3. Installs `govcc` on gov-validation-channel
4. Installs `investcc` on investment-channel
5. Approves and commits both chaincodes

**Expected output:**
```
=== Refreshing MSP ===
OK  StartupOrg / ValidatorOrg / InvestorOrg / PlatformOrg / Orderer
=== Installing govcc === ... govcc committed OK
=== Installing investcc === ... investcc committed OK
=== ALL DONE — Ready to run tests ===
```

---

## Phase 3 — Run Test Suites

> **Note:** All test scripts have been updated to automatically detect the correct paths. No manual configuration needed!

```bash
# Set peer identity
export CORE_PEER_LOCALMSPID=StartupOrgMSP
export CORE_PEER_MSPCONFIGPATH=$(pwd)/_msp/StartupOrg/startuporgadmin/msp
export CORE_PEER_ADDRESS=startuporgpeer-api.127-0-0-1.nip.io:9090

# Verify channels
peer channel list   # Expected: gov-validation-channel, investment-channel

# Run tests
./test-functional.sh    # Business logic       → 92.3%  (12/13)
./test-failure.sh       # Error handling       → 100%   (9/9)
./test-concurrency.sh   # Parallel tx          → 100%   (3/3)
./test-privacy.sh       # Channel isolation    → 100%
```

---

## Phase 4 — Start the Web Application

**Terminal 1 — Backend API:**
```bash
cd backend
npm install   # first time only
npm run dev   # → http://127.0.0.1:3000
```

**Terminal 2 — Frontend UI:**
```bash
cd frontend
npm install   # first time only
npm run dev   # → http://localhost:5173
```

Open **`http://127.0.0.1:5173`** in browser.

---

## Demo Flow (End-to-End)

1. **Startup Portal** → Register Startup
2. **Validator Portal** → Approve Startup
3. **Project Board** → Create Project → Approve Project
4. **Investor Portal** → Register Investor → Approve Investor
5. **Investment Desk** → Fund Project
6. **Investor Portal** → Raise Dispute (optional)
7. **Validator Portal** → Resolve Dispute → REFUND or DISMISS
8. **Investment Desk** → Refund (if REFUND decision)
9. **Performance Analysis** → Run Live Stress Test → view TPS

---

## Data Persistence

| Action | Effect |
| :--- | :--- |
| `docker stop microfab` | ✅ Data preserved |
| `docker start microfab` | ✅ Resumes with all data |
| `docker rm -f microfab` | ❌ All data lost |

---

## Troubleshooting

| Problem | Fix |
| :--- | :--- |
| `peer: command not found` | Add to PATH: `export PATH=$PATH:$(pwd)/bin` |
| `Config File "core" Not Found` | Test scripts are now auto-configured |
| `sequence mismatch` in redeploy.sh | Safe to ignore — chaincode already deployed |
| `Failed to fetch` in browser | Start backend first, hard refresh `Ctrl+Shift+R` |

---

## Architecture

```
┌──────────────────────────────────────────────┐
│           Microfab (localhost:9090)           │
│  ┌────────────┐      ┌──────────────────────┐│
│  │gov-channel │      │  investment-channel  ││
│  │StartupOrg  │      │  StartupOrg          ││
│  │ValidatorOrg│      │  ValidatorOrg        ││
│  │PlatformOrg │      │  InvestorOrg         ││
│  └────────────┘      │  PlatformOrg         ││
│                      └──────────────────────┘│
└──────────────────────────────────────────────┘
         ↕ Node.js Backend (port 3000)
         ↕ React Frontend (port 5173)
```
