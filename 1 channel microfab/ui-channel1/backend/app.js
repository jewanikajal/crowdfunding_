const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { getContract } = require("./fabric");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const CHANNEL = "cip-main-channel";
const CHAINCODE = "cipcc";
const PERF_HISTORY_PATH = path.join(__dirname, "perf", "perf-history.json");
const PERF_RUNNER_PATH = path.join(__dirname, "perf", "runPerf.js");
let perfRunning = false;

function asString(value) {
  return value === undefined || value === null ? "" : String(value);
}

function loadPerfHistory() {
  try {
    const raw = fs.readFileSync(PERF_HISTORY_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

async function withContract(channel, chaincode, org, identity, handler, res) {
  let gateway;
  try {
    const conn = await getContract(channel, chaincode, org, identity);
    gateway = conn.gateway;
    await handler(conn.contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  } finally {
    if (gateway) {
      gateway.disconnect();
    }
  }
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/perf/history", (req, res) => {
  res.json(loadPerfHistory());
});

app.post("/perf/run", async (req, res) => {
  if (perfRunning) {
    res.status(409).json({ error: "Performance test already running" });
    return;
  }

  const totalTx = asString(req.body?.totalTx || 1000);
  const concurrency = asString(req.body?.concurrency || 8);
  perfRunning = true;

  const child = spawn(process.execPath, [PERF_RUNNER_PATH], {
    env: {
      ...process.env,
      API_BASE: process.env.API_BASE || "http://localhost:4000",
      TOTAL_TX: totalTx,
      CONCURRENCY: concurrency,
    },
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("close", (code) => {
    perfRunning = false;
    if (code !== 0) {
      res.status(500).json({ error: stderr || "Performance run failed" });
      return;
    }

    const history = loadPerfHistory();
    res.json({ ok: true, latest: history[0] || null, history });
  });
});

// Startup
app.post("/startup/register", async (req, res) => {
  const {
    id,
    name,
    email,
    panNumber,
    gstNumber,
    incorporationDate,
    industry,
    businessType,
    country,
    state,
    city,
    website,
    description,
    foundedYear,
    founderName,
  } = req.body;

  await withContract(
    CHANNEL,
    CHAINCODE,
    "StartupOrg",
    "startuporgadmin",
    async (contract) => {
      await contract.submitTransaction(
        "RegisterStartup",
        asString(id),
        asString(name),
        asString(email),
        asString(panNumber),
        asString(gstNumber),
        asString(incorporationDate),
        asString(industry),
        asString(businessType),
        asString(country),
        asString(state),
        asString(city),
        asString(website),
        asString(description),
        asString(foundedYear),
        asString(founderName),
      );
      res.json({ message: "Startup registered" });
    },
    res,
  );
});

app.post("/startup/validate", async (req, res) => {
  const { id, decision } = req.body;
  await withContract(
    CHANNEL,
    CHAINCODE,
    "ValidatorOrg",
    "validatororgadmin",
    async (contract) => {
      await contract.submitTransaction(
        "ValidateStartup",
        asString(id),
        asString(decision),
      );
      res.json({ message: "Startup validated" });
    },
    res,
  );
});

app.get("/startup/:id", async (req, res) => {
  await withContract(
    CHANNEL,
    CHAINCODE,
    "StartupOrg",
    "startuporgadmin",
    async (contract) => {
      const result = await contract.evaluateTransaction(
        "GetStartup",
        asString(req.params.id),
      );
      res.json(JSON.parse(result.toString()));
    },
    res,
  );
});

// Investor
app.post("/investor/register", async (req, res) => {
  const {
    id,
    name,
    email,
    panNumber,
    aadharNumber,
    investorType,
    country,
    state,
    city,
    investmentFocus,
    portfolioSize,
    annualIncome,
    organizationName,
  } = req.body;

  await withContract(
    CHANNEL,
    CHAINCODE,
    "InvestorOrg",
    "investororgadmin",
    async (contract) => {
      await contract.submitTransaction(
        "RegisterInvestor",
        asString(id),
        asString(name),
        asString(email),
        asString(panNumber),
        asString(aadharNumber),
        asString(investorType),
        asString(country),
        asString(state),
        asString(city),
        asString(investmentFocus),
        asString(portfolioSize),
        asString(annualIncome),
        asString(organizationName),
      );
      res.json({ message: "Investor registered" });
    },
    res,
  );
});

app.post("/investor/validate", async (req, res) => {
  const { id, decision } = req.body;
  await withContract(
    CHANNEL,
    CHAINCODE,
    "ValidatorOrg",
    "validatororgadmin",
    async (contract) => {
      await contract.submitTransaction(
        "ValidateInvestor",
        asString(id),
        asString(decision),
      );
      res.json({ message: "Investor validated" });
    },
    res,
  );
});

app.get("/investor/:id", async (req, res) => {
  await withContract(
    CHANNEL,
    CHAINCODE,
    "InvestorOrg",
    "investororgadmin",
    async (contract) => {
      const result = await contract.evaluateTransaction(
        "GetInvestor",
        asString(req.params.id),
      );
      res.json(JSON.parse(result.toString()));
    },
    res,
  );
});

// Project
app.post("/project/create", async (req, res) => {
  const {
    projectID,
    startupID,
    title,
    description,
    goal,
    duration,
    industry,
    projectType,
    country,
    targetMarket,
    currentStage,
  } = req.body;

  await withContract(
    CHANNEL,
    CHAINCODE,
    "StartupOrg",
    "startuporgadmin",
    async (contract) => {
      await contract.submitTransaction(
        "CreateProject",
        asString(projectID),
        asString(startupID),
        asString(title),
        asString(description),
        asString(goal),
        asString(duration),
        asString(industry),
        asString(projectType),
        asString(country),
        asString(targetMarket),
        asString(currentStage),
      );
      res.json({ message: "Project created" });
    },
    res,
  );
});

app.post("/project/approve", async (req, res) => {
  const { projectID } = req.body;
  await withContract(
    CHANNEL,
    CHAINCODE,
    "ValidatorOrg",
    "validatororgadmin",
    async (contract) => {
      await contract.submitTransaction("ApproveProject", asString(projectID));
      res.json({ message: "Project approved" });
    },
    res,
  );
});

app.get("/project/:id", async (req, res) => {
  await withContract(
    CHANNEL,
    CHAINCODE,
    "StartupOrg",
    "startuporgadmin",
    async (contract) => {
      const result = await contract.evaluateTransaction(
        "GetProject",
        asString(req.params.id),
      );
      res.json(JSON.parse(result.toString()));
    },
    res,
  );
});

// Funding
app.post("/fund", async (req, res) => {
  const { projectID, investorID, amount } = req.body;
  await withContract(
    CHANNEL,
    CHAINCODE,
    "InvestorOrg",
    "investororgadmin",
    async (contract) => {
      await contract.submitTransaction(
        "Fund",
        asString(projectID),
        asString(investorID),
        asString(amount),
      );
      res.json({ message: "Funding submitted" });
    },
    res,
  );
});

app.post("/release", async (req, res) => {
  const { projectID } = req.body;
  await withContract(
    CHANNEL,
    CHAINCODE,
    "PlatformOrg",
    "platformorgadmin",
    async (contract) => {
      await contract.submitTransaction("ReleaseFunds", asString(projectID));
      res.json({ message: "Funds released" });
    },
    res,
  );
});

app.post("/refund", async (req, res) => {
  const { projectID, investorID } = req.body;
  await withContract(
    CHANNEL,
    CHAINCODE,
    "InvestorOrg",
    "investororgadmin",
    async (contract) => {
      await contract.submitTransaction(
        "Refund",
        asString(projectID),
        asString(investorID),
      );
      res.json({ message: "Refund processed" });
    },
    res,
  );
});

app.post("/dispute/raise", async (req, res) => {
  const { projectID, investorID, reason } = req.body;
  await withContract(
    CHANNEL,
    CHAINCODE,
    "InvestorOrg",
    "investororgadmin",
    async (contract) => {
      await contract.submitTransaction(
        "RaiseDispute",
        asString(projectID),
        asString(investorID),
        asString(reason),
      );
      res.json({ message: "Dispute raised" });
    },
    res,
  );
});

app.post("/dispute/resolve", async (req, res) => {
  const { projectID, investorID, resolution } = req.body;
  await withContract(
    CHANNEL,
    CHAINCODE,
    "ValidatorOrg",
    "validatororgadmin",
    async (contract) => {
      await contract.submitTransaction(
        "ResolveDispute",
        asString(projectID),
        asString(investorID),
        asString(resolution),
      );
      res.json({ message: "Dispute resolved" });
    },
    res,
  );
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Channel 1 backend running on http://localhost:${PORT}`);
});
