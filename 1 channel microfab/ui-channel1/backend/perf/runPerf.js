const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.API_BASE || "http://localhost:4000";
const TOTAL_TX = Number.parseInt(process.env.TOTAL_TX || "1000", 10);
const CONCURRENCY = Number.parseInt(process.env.CONCURRENCY || "8", 10);
const MAX_HISTORY = Number.parseInt(process.env.MAX_HISTORY || "20", 10);
const PERF_HISTORY_PATH = path.join(__dirname, "perf-history.json");

const CHAIN_SIZE = 7;

if (typeof fetch !== "function") {
  throw new Error("Node 18+ is required (global fetch not available).");
}

function nowMs() {
  return Date.now();
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

async function callApi(pathname, method, body, op) {
  const started = nowMs();
  try {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    const latencyMs = nowMs() - started;
    if (!response.ok) {
      return {
        ok: false,
        op,
        latencyMs,
        error: data.error || "Request failed",
      };
    }
    return { ok: true, op, latencyMs };
  } catch (err) {
    return { ok: false, op, latencyMs: nowMs() - started, error: err.message };
  }
}

async function runChain(
  index,
  prefix,
  approvedInvestors,
  approvedProjects,
  results,
) {
  const startupId = `${prefix}s${index}`;
  const investorId = `${prefix}i${index}`;
  const projectId = `${prefix}p${index}`;

  results.push(
    await callApi(
      "/startup/register",
      "POST",
      {
        id: startupId,
        name: `Perf Startup ${index}`,
        email: `${startupId}@test.com`,
        panNumber: `PAN${index}`,
        gstNumber: `GST${index}`,
        incorporationDate: "2020-01-01",
        industry: "fintech",
        businessType: "product",
        country: "India",
        state: "MH",
        city: "Pune",
        website: "https://example.com",
        description: "Perf startup",
        foundedYear: "2020",
        founderName: "Founder",
      },
      "startup.register",
    ),
  );

  results.push(
    await callApi(
      "/startup/validate",
      "POST",
      { id: startupId, decision: "APPROVED" },
      "startup.validate",
    ),
  );

  results.push(
    await callApi(
      "/investor/register",
      "POST",
      {
        id: investorId,
        name: `Perf Investor ${index}`,
        email: `${investorId}@test.com`,
        panNumber: `PANINV${index}`,
        aadharNumber: `AADHAR${index}`,
        investorType: "angel",
        country: "India",
        state: "MH",
        city: "Mumbai",
        investmentFocus: "fintech",
        portfolioSize: "medium",
        annualIncome: "1000000",
        organizationName: "",
      },
      "investor.register",
    ),
  );

  results.push(
    await callApi(
      "/investor/validate",
      "POST",
      { id: investorId, decision: "APPROVED" },
      "investor.validate",
    ),
  );

  results.push(
    await callApi(
      "/project/create",
      "POST",
      {
        projectID: projectId,
        startupID: startupId,
        title: `Project ${index}`,
        description: "Perf project",
        goal: "100000",
        duration: "30",
        industry: "fintech",
        projectType: "equity",
        country: "India",
        targetMarket: "SMEs",
        currentStage: "mvp",
      },
      "project.create",
    ),
  );

  results.push(
    await callApi(
      "/project/approve",
      "POST",
      { projectID: projectId },
      "project.approve",
    ),
  );

  results.push(
    await callApi(
      "/fund",
      "POST",
      { projectID: projectId, investorID: investorId, amount: "5000" },
      "fund",
    ),
  );

  approvedInvestors.push(investorId);
  approvedProjects.push(projectId);
}

async function runWithConcurrency(count, concurrency, runner) {
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= count) {
        break;
      }
      await runner(current);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

async function main() {
  const prefix = `perf${Date.now()}_`;
  const chainCount = Math.floor(TOTAL_TX / CHAIN_SIZE);
  const remainder = TOTAL_TX - chainCount * CHAIN_SIZE;

  const approvedInvestors = [];
  const approvedProjects = [];
  const results = [];

  const started = nowMs();
  await runWithConcurrency(chainCount, CONCURRENCY, (index) =>
    runChain(index, prefix, approvedInvestors, approvedProjects, results),
  );

  if (remainder > 0 && approvedProjects.length > 0) {
    await runWithConcurrency(
      remainder,
      Math.min(CONCURRENCY, remainder),
      async (idx) => {
        const projectId = approvedProjects[idx % approvedProjects.length];
        const investorId = approvedInvestors[idx % approvedInvestors.length];
        results.push(
          await callApi(
            "/fund",
            "POST",
            { projectID: projectId, investorID: investorId, amount: "2500" },
            "fund",
          ),
        );
      },
    );
  }

  const durationMs = nowMs() - started;
  const success = results.filter((r) => r.ok).length;
  const failed = results.length - success;
  const tps = durationMs > 0 ? success / (durationMs / 1000) : 0;
  const latencies = results.map((r) => r.latencyMs);

  const perOp = {};
  for (const result of results) {
    if (!perOp[result.op]) {
      perOp[result.op] = { latencies: [], success: 0, failed: 0 };
    }
    perOp[result.op].latencies.push(result.latencyMs);
    if (result.ok) {
      perOp[result.op].success += 1;
    } else {
      perOp[result.op].failed += 1;
    }
  }

  const perOpStats = Object.entries(perOp).reduce((acc, [op, data]) => {
    const sorted = [...data.latencies].sort((a, b) => a - b);
    acc[op] = {
      count: data.latencies.length,
      success: data.success,
      failed: data.failed,
      avgMs: Math.round(average(data.latencies)),
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      minMs: sorted[0] || 0,
      maxMs: sorted[sorted.length - 1] || 0,
    };
    return acc;
  }, {});

  const run = {
    id: new Date().toISOString(),
    totalTx: results.length,
    success,
    failed,
    durationMs,
    tps: Number(tps.toFixed(2)),
    concurrency: CONCURRENCY,
    chainCount,
    remainder,
    latency: {
      avgMs: Math.round(average(latencies)),
      p50Ms: percentile(latencies, 50),
      p95Ms: percentile(latencies, 95),
      minMs: Math.min(...latencies),
      maxMs: Math.max(...latencies),
    },
    perOp: perOpStats,
  };

  let history = [];
  try {
    const raw = fs.readFileSync(PERF_HISTORY_PATH, "utf-8");
    history = JSON.parse(raw);
    if (!Array.isArray(history)) {
      history = [];
    }
  } catch (err) {
    history = [];
  }

  history.unshift(run);
  history = history.slice(0, MAX_HISTORY);
  fs.writeFileSync(PERF_HISTORY_PATH, JSON.stringify(history, null, 2));

  console.log("Performance run complete:");
  console.log(JSON.stringify(run, null, 2));
}

main().catch((err) => {
  console.error("Perf run failed:", err);
  process.exit(1);
});
