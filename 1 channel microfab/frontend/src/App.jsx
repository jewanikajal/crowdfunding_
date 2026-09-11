import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function ResponseModal({ open, title, body, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-kicker">Action Response</p>
            <h3>{title}</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>
        <pre className="modal-body">{body || "No response"}</pre>
      </div>
    </div>
  );
}

function Sidebar({ navItems, apiStatus }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">CF</div>
        <div>
          <div className="brand-title">ChainFund</div>
          <div className="brand-sub">Hyperledger Fabric</div>
        </div>
      </div>
      <div className="status-pill">
        <span className="dot" />
        <div>
          <div className="pill-title">Microfab Online</div>
          <div className="pill-sub">localhost:9090</div>
        </div>
      </div>
      <div className={`status-pill ${apiStatus}`}>
        <span className="dot" />
        <div>
          <div className="pill-title">API {apiStatus}</div>
          <div className="pill-sub">{API_BASE}</div>
        </div>
      </div>
      <nav>
        {navItems.map((item) => (
          <a key={item.id} href={`#${item.id}`} className="nav-item">
            {item.label}
          </a>
        ))}
      </nav>
      <div className="channels">
        <div className="channels-title">Channel</div>
        <div className="channels-list">cip-main-channel</div>
      </div>
    </aside>
  );
}

function OverviewSection({ status }) {
  return (
    <section id="overview" className="panel hero">
      <div>
        <p className="eyebrow">Channel 1 Dashboard</p>
        <h1>Single Channel Crowdfunding Control Room</h1>
        <p className="lead">
          Manage startup onboarding, investor approvals, project creation,
          funding, and query flows on cip-main-channel.
        </p>
        <div className={`status-banner ${status.type}`}>
          <span>Status</span>
          <strong>{status.message || "Idle"}</strong>
        </div>
      </div>
      <div className="hero-card">
        <h3>Quick Metrics</h3>
        <div className="metric-grid">
          <div>
            <div className="metric-label">Last TPS</div>
            <div className="metric-value">2.40</div>
          </div>
          <div>
            <div className="metric-label">Channel</div>
            <div className="metric-value">cip-main-channel</div>
          </div>
          <div>
            <div className="metric-label">Chaincode</div>
            <div className="metric-value">cipcc</div>
          </div>
          <div>
            <div className="metric-label">Network</div>
            <div className="metric-value">Microfab</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StartupSection({
  startupForm,
  setStartupForm,
  startupValidate,
  setStartupValidate,
  queryIds,
  setQueryIds,
  callApi,
}) {
  return (
    <section id="startup" className="panel grid two">
      <div className="card">
        <h2>Register Startup</h2>
        <div className="grid two">
          <label>
            Startup ID
            <input
              value={startupForm.id}
              onChange={(e) =>
                setStartupForm({ ...startupForm, id: e.target.value })
              }
            />
          </label>
          <label>
            Name
            <input
              value={startupForm.name}
              onChange={(e) =>
                setStartupForm({ ...startupForm, name: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Email
          <input
            value={startupForm.email}
            onChange={(e) =>
              setStartupForm({ ...startupForm, email: e.target.value })
            }
          />
        </label>
        <div className="grid two">
          <label>
            PAN
            <input
              value={startupForm.panNumber}
              onChange={(e) =>
                setStartupForm({
                  ...startupForm,
                  panNumber: e.target.value,
                })
              }
            />
          </label>
          <label>
            GST
            <input
              value={startupForm.gstNumber}
              onChange={(e) =>
                setStartupForm({
                  ...startupForm,
                  gstNumber: e.target.value,
                })
              }
            />
          </label>
        </div>
        <label>
          Incorporation Date
          <input
            value={startupForm.incorporationDate}
            onChange={(e) =>
              setStartupForm({
                ...startupForm,
                incorporationDate: e.target.value,
              })
            }
          />
        </label>
        <div className="grid two">
          <label>
            Industry
            <input
              value={startupForm.industry}
              onChange={(e) =>
                setStartupForm({ ...startupForm, industry: e.target.value })
              }
            />
          </label>
          <label>
            Business Type
            <input
              value={startupForm.businessType}
              onChange={(e) =>
                setStartupForm({
                  ...startupForm,
                  businessType: e.target.value,
                })
              }
            />
          </label>
        </div>
        <div className="grid three">
          <label>
            Country
            <input
              value={startupForm.country}
              onChange={(e) =>
                setStartupForm({ ...startupForm, country: e.target.value })
              }
            />
          </label>
          <label>
            State
            <input
              value={startupForm.state}
              onChange={(e) =>
                setStartupForm({ ...startupForm, state: e.target.value })
              }
            />
          </label>
          <label>
            City
            <input
              value={startupForm.city}
              onChange={(e) =>
                setStartupForm({ ...startupForm, city: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Website
          <input
            value={startupForm.website}
            onChange={(e) =>
              setStartupForm({ ...startupForm, website: e.target.value })
            }
          />
        </label>
        <label>
          Description
          <textarea
            value={startupForm.description}
            onChange={(e) =>
              setStartupForm({
                ...startupForm,
                description: e.target.value,
              })
            }
          />
        </label>
        <div className="grid two">
          <label>
            Founded Year
            <input
              value={startupForm.foundedYear}
              onChange={(e) =>
                setStartupForm({
                  ...startupForm,
                  foundedYear: e.target.value,
                })
              }
            />
          </label>
          <label>
            Founder Name
            <input
              value={startupForm.founderName}
              onChange={(e) =>
                setStartupForm({
                  ...startupForm,
                  founderName: e.target.value,
                })
              }
            />
          </label>
        </div>
        <button
          onClick={() =>
            callApi(
              "/startup/register",
              "POST",
              startupForm,
              "Startup registered",
            )
          }
        >
          Register Startup
        </button>
      </div>

      <div className="card">
        <h2>Validate Startup</h2>
        <label>
          Startup ID
          <input
            value={startupValidate.id}
            onChange={(e) =>
              setStartupValidate({ ...startupValidate, id: e.target.value })
            }
          />
        </label>
        <label>
          Decision
          <select
            value={startupValidate.decision}
            onChange={(e) =>
              setStartupValidate({
                ...startupValidate,
                decision: e.target.value,
              })
            }
          >
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
        <button
          className="accent"
          onClick={() =>
            callApi(
              "/startup/validate",
              "POST",
              startupValidate,
              "Startup validated",
            )
          }
        >
          Submit Validation
        </button>

        <h2 className="section-title">Query Startup</h2>
        <label>
          Startup ID
          <input
            value={queryIds.startupId}
            onChange={(e) =>
              setQueryIds({ ...queryIds, startupId: e.target.value })
            }
          />
        </label>
        <button
          className="ghost"
          onClick={() =>
            callApi(
              `/startup/${queryIds.startupId}`,
              "GET",
              null,
              "Startup details",
            )
          }
        >
          Fetch Startup
        </button>
      </div>
    </section>
  );
}

function InvestorSection({
  investorForm,
  setInvestorForm,
  investorValidate,
  setInvestorValidate,
  queryIds,
  setQueryIds,
  callApi,
}) {
  return (
    <section id="investor" className="panel grid two">
      <div className="card">
        <h2>Register Investor</h2>
        <div className="grid two">
          <label>
            Investor ID
            <input
              value={investorForm.id}
              onChange={(e) =>
                setInvestorForm({ ...investorForm, id: e.target.value })
              }
            />
          </label>
          <label>
            Name
            <input
              value={investorForm.name}
              onChange={(e) =>
                setInvestorForm({ ...investorForm, name: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Email
          <input
            value={investorForm.email}
            onChange={(e) =>
              setInvestorForm({ ...investorForm, email: e.target.value })
            }
          />
        </label>
        <div className="grid two">
          <label>
            PAN
            <input
              value={investorForm.panNumber}
              onChange={(e) =>
                setInvestorForm({
                  ...investorForm,
                  panNumber: e.target.value,
                })
              }
            />
          </label>
          <label>
            Aadhar
            <input
              value={investorForm.aadharNumber}
              onChange={(e) =>
                setInvestorForm({
                  ...investorForm,
                  aadharNumber: e.target.value,
                })
              }
            />
          </label>
        </div>
        <div className="grid two">
          <label>
            Investor Type
            <input
              value={investorForm.investorType}
              onChange={(e) =>
                setInvestorForm({
                  ...investorForm,
                  investorType: e.target.value,
                })
              }
            />
          </label>
          <label>
            Focus
            <input
              value={investorForm.investmentFocus}
              onChange={(e) =>
                setInvestorForm({
                  ...investorForm,
                  investmentFocus: e.target.value,
                })
              }
            />
          </label>
        </div>
        <div className="grid three">
          <label>
            Country
            <input
              value={investorForm.country}
              onChange={(e) =>
                setInvestorForm({
                  ...investorForm,
                  country: e.target.value,
                })
              }
            />
          </label>
          <label>
            State
            <input
              value={investorForm.state}
              onChange={(e) =>
                setInvestorForm({ ...investorForm, state: e.target.value })
              }
            />
          </label>
          <label>
            City
            <input
              value={investorForm.city}
              onChange={(e) =>
                setInvestorForm({ ...investorForm, city: e.target.value })
              }
            />
          </label>
        </div>
        <div className="grid three">
          <label>
            Portfolio
            <input
              value={investorForm.portfolioSize}
              onChange={(e) =>
                setInvestorForm({
                  ...investorForm,
                  portfolioSize: e.target.value,
                })
              }
            />
          </label>
          <label>
            Annual Income
            <input
              value={investorForm.annualIncome}
              onChange={(e) =>
                setInvestorForm({
                  ...investorForm,
                  annualIncome: e.target.value,
                })
              }
            />
          </label>
          <label>
            Organization
            <input
              value={investorForm.organizationName}
              onChange={(e) =>
                setInvestorForm({
                  ...investorForm,
                  organizationName: e.target.value,
                })
              }
            />
          </label>
        </div>
        <button
          onClick={() =>
            callApi(
              "/investor/register",
              "POST",
              investorForm,
              "Investor registered",
            )
          }
        >
          Register Investor
        </button>
      </div>

      <div className="card">
        <h2>Validate Investor (Validator)</h2>
        <label>
          Investor ID
          <input
            value={investorValidate.id}
            onChange={(e) =>
              setInvestorValidate({
                ...investorValidate,
                id: e.target.value,
              })
            }
          />
        </label>
        <label>
          Decision
          <select
            value={investorValidate.decision}
            onChange={(e) =>
              setInvestorValidate({
                ...investorValidate,
                decision: e.target.value,
              })
            }
          >
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
        <button
          className="accent"
          onClick={() =>
            callApi(
              "/investor/validate",
              "POST",
              investorValidate,
              "Investor validated",
            )
          }
        >
          Submit Validation
        </button>

        <h2 className="section-title">Query Investor</h2>
        <label>
          Investor ID
          <input
            value={queryIds.investorId}
            onChange={(e) =>
              setQueryIds({ ...queryIds, investorId: e.target.value })
            }
          />
        </label>
        <button
          className="ghost"
          onClick={() =>
            callApi(
              `/investor/${queryIds.investorId}`,
              "GET",
              null,
              "Investor details",
            )
          }
        >
          Fetch Investor
        </button>
      </div>
    </section>
  );
}

function ProjectSection({
  projectForm,
  setProjectForm,
  queryIds,
  setQueryIds,
  callApi,
}) {
  return (
    <section id="project" className="panel grid two">
      <div className="card">
        <h2>Create Project</h2>
        <label>
          Project ID
          <input
            value={projectForm.projectID}
            onChange={(e) =>
              setProjectForm({ ...projectForm, projectID: e.target.value })
            }
          />
        </label>
        <label>
          Startup ID
          <input
            value={projectForm.startupID}
            onChange={(e) =>
              setProjectForm({ ...projectForm, startupID: e.target.value })
            }
          />
        </label>
        <label>
          Title
          <input
            value={projectForm.title}
            onChange={(e) =>
              setProjectForm({ ...projectForm, title: e.target.value })
            }
          />
        </label>
        <label>
          Description
          <textarea
            value={projectForm.description}
            onChange={(e) =>
              setProjectForm({
                ...projectForm,
                description: e.target.value,
              })
            }
          />
        </label>
        <div className="grid two">
          <label>
            Goal
            <input
              value={projectForm.goal}
              onChange={(e) =>
                setProjectForm({ ...projectForm, goal: e.target.value })
              }
            />
          </label>
          <label>
            Duration (days)
            <input
              value={projectForm.duration}
              onChange={(e) =>
                setProjectForm({ ...projectForm, duration: e.target.value })
              }
            />
          </label>
        </div>
        <div className="grid two">
          <label>
            Industry
            <input
              value={projectForm.industry}
              onChange={(e) =>
                setProjectForm({ ...projectForm, industry: e.target.value })
              }
            />
          </label>
          <label>
            Project Type
            <input
              value={projectForm.projectType}
              onChange={(e) =>
                setProjectForm({
                  ...projectForm,
                  projectType: e.target.value,
                })
              }
            />
          </label>
        </div>
        <div className="grid two">
          <label>
            Country
            <input
              value={projectForm.country}
              onChange={(e) =>
                setProjectForm({ ...projectForm, country: e.target.value })
              }
            />
          </label>
          <label>
            Target Market
            <input
              value={projectForm.targetMarket}
              onChange={(e) =>
                setProjectForm({
                  ...projectForm,
                  targetMarket: e.target.value,
                })
              }
            />
          </label>
        </div>
        <label>
          Current Stage
          <input
            value={projectForm.currentStage}
            onChange={(e) =>
              setProjectForm({
                ...projectForm,
                currentStage: e.target.value,
              })
            }
          />
        </label>
        <button
          onClick={() =>
            callApi("/project/create", "POST", projectForm, "Project created")
          }
        >
          Create Project
        </button>
      </div>

      <div className="card">
        <h2>Query Project</h2>
        <label>
          Project ID
          <input
            value={queryIds.projectId}
            onChange={(e) =>
              setQueryIds({ ...queryIds, projectId: e.target.value })
            }
          />
        </label>
        <button
          className="ghost"
          onClick={() =>
            callApi(
              `/project/${queryIds.projectId}`,
              "GET",
              null,
              "Project details",
            )
          }
        >
          Fetch Project
        </button>
      </div>
    </section>
  );
}

function ValidatorSection({ projectApprove, setProjectApprove, callApi }) {
  return (
    <section id="validator" className="panel grid two">
      <div className="card">
        <h2>Approve Project (Validator)</h2>
        <label>
          Project ID
          <input
            value={projectApprove.projectID}
            onChange={(e) => setProjectApprove({ projectID: e.target.value })}
          />
        </label>
        <button
          className="approve"
          onClick={() =>
            callApi(
              "/project/approve",
              "POST",
              projectApprove,
              "Project approved",
            )
          }
        >
          Approve Project
        </button>
      </div>
      <div className="card">
        <h2>Validator Checklist</h2>
        <p className="muted">
          Validate investors before approval and ensure project details are
          complete.
        </p>
      </div>
    </section>
  );
}

function FundingSection({ fundForm, setFundForm, result, callApi }) {
  return (
    <section id="fund" className="panel grid two">
      <div className="card">
        <h2>Fund Project</h2>
        <label>
          Project ID
          <input
            value={fundForm.projectID}
            onChange={(e) =>
              setFundForm({ ...fundForm, projectID: e.target.value })
            }
          />
        </label>
        <label>
          Investor ID
          <input
            value={fundForm.investorID}
            onChange={(e) =>
              setFundForm({ ...fundForm, investorID: e.target.value })
            }
          />
        </label>
        <label>
          Amount
          <input
            value={fundForm.amount}
            onChange={(e) =>
              setFundForm({ ...fundForm, amount: e.target.value })
            }
          />
        </label>
        <button
          className="accent"
          onClick={() =>
            callApi("/fund", "POST", fundForm, "Funding submitted")
          }
        >
          Fund Project
        </button>
      </div>

      <div className="card">
        <h2>Response Console</h2>
        <pre className="console">
          {result || "Response data will appear here."}
        </pre>
      </div>
    </section>
  );
}

function SettlementSection({
  releaseForm,
  setReleaseForm,
  refundForm,
  setRefundForm,
  disputeForm,
  setDisputeForm,
  resolveForm,
  setResolveForm,
  callApi,
}) {
  return (
    <section id="settlement" className="panel grid two">
      <div className="card">
        <h2>Release Funds (Platform)</h2>
        <label>
          Project ID
          <input
            value={releaseForm.projectID}
            onChange={(e) => setReleaseForm({ projectID: e.target.value })}
          />
        </label>
        <button
          className="approve"
          onClick={() =>
            callApi("/release", "POST", releaseForm, "Funds released")
          }
        >
          Release Funds
        </button>
      </div>

      <div className="card">
        <h2>Refund Investor</h2>
        <label>
          Project ID
          <input
            value={refundForm.projectID}
            onChange={(e) =>
              setRefundForm({ ...refundForm, projectID: e.target.value })
            }
          />
        </label>
        <label>
          Investor ID
          <input
            value={refundForm.investorID}
            onChange={(e) =>
              setRefundForm({ ...refundForm, investorID: e.target.value })
            }
          />
        </label>
        <button
          className="ghost"
          onClick={() =>
            callApi("/refund", "POST", refundForm, "Refund processed")
          }
        >
          Process Refund
        </button>
      </div>

      <div className="card">
        <h2>Raise Dispute</h2>
        <label>
          Project ID
          <input
            value={disputeForm.projectID}
            onChange={(e) =>
              setDisputeForm({ ...disputeForm, projectID: e.target.value })
            }
          />
        </label>
        <label>
          Investor ID
          <input
            value={disputeForm.investorID}
            onChange={(e) =>
              setDisputeForm({ ...disputeForm, investorID: e.target.value })
            }
          />
        </label>
        <label>
          Reason
          <textarea
            value={disputeForm.reason}
            onChange={(e) =>
              setDisputeForm({ ...disputeForm, reason: e.target.value })
            }
          />
        </label>
        <button
          onClick={() =>
            callApi("/dispute/raise", "POST", disputeForm, "Dispute raised")
          }
        >
          Raise Dispute
        </button>
      </div>

      <div className="card">
        <h2>Resolve Dispute (Validator)</h2>
        <label>
          Project ID
          <input
            value={resolveForm.projectID}
            onChange={(e) =>
              setResolveForm({ ...resolveForm, projectID: e.target.value })
            }
          />
        </label>
        <label>
          Investor ID
          <input
            value={resolveForm.investorID}
            onChange={(e) =>
              setResolveForm({ ...resolveForm, investorID: e.target.value })
            }
          />
        </label>
        <label>
          Resolution
          <select
            value={resolveForm.resolution}
            onChange={(e) =>
              setResolveForm({ ...resolveForm, resolution: e.target.value })
            }
          >
            <option value="REFUND">REFUND</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
        <button
          className="accent"
          onClick={() =>
            callApi("/dispute/resolve", "POST", resolveForm, "Dispute resolved")
          }
        >
          Resolve Dispute
        </button>
      </div>
    </section>
  );
}

function PerformanceSection({
  history,
  loading,
  error,
  running,
  lastUpdated,
  onRefresh,
  onRunTest,
}) {
  const latest = history[0];
  const trend = history.slice(0, 8).reverse();
  const maxTps = Math.max(1, ...trend.map((run) => run.tps || 0));
  const maxP95 = Math.max(1, ...trend.map((run) => run.latency?.p95Ms || 0));

  const formatMs = (value) => `${Math.round(value)} ms`;
  const formatTps = (value) => (value ? value.toFixed(2) : "0.00");

  return (
    <section id="performance" className="panel">
      <div className="card">
        <div className="perf-header">
          <div>
            <h2>Performance Snapshot</h2>
            <p className="muted">Latest run from perf history.</p>
            {lastUpdated && (
              <p className="muted">Last updated: {lastUpdated}</p>
            )}
          </div>
          <div className="perf-actions">
            <button className="ghost" onClick={onRefresh}>
              Refresh
            </button>
            <button
              onClick={() => onRunTest({ totalTx: 1000, concurrency: 8 })}
              disabled={running}
            >
              {running ? "Running..." : "Run 1000 Tx Test"}
            </button>
          </div>
        </div>
        {loading && <p className="muted">Loading performance history...</p>}
        {running && <p className="muted">Performance test in progress...</p>}
        {error && <p className="muted">{error}</p>}
        {!loading && latest && (
          <div className="grid four">
            <div className="metric">
              <span>Total Transactions</span>
              <strong>{latest.totalTx}</strong>
              <em>Success {latest.success}</em>
            </div>
            <div className="metric">
              <span>Duration</span>
              <strong>{formatMs(latest.durationMs)}</strong>
              <em>TPS {formatTps(latest.tps)}</em>
            </div>
            <div className="metric">
              <span>Latency (p50)</span>
              <strong>{formatMs(latest.latency?.p50Ms || 0)}</strong>
              <em>p95 {formatMs(latest.latency?.p95Ms || 0)}</em>
            </div>
            <div className="metric">
              <span>Concurrency</span>
              <strong>{latest.concurrency}</strong>
              <em>Chains {latest.chainCount}</em>
            </div>
          </div>
        )}
        {!loading && !latest && (
          <p className="muted">Run a benchmark to populate metrics.</p>
        )}
      </div>
      <div className="card">
        <div className="perf-header">
          <div>
            <h3>Benchmark Mode</h3>
            <p className="muted">Preset runs with mixed operations.</p>
          </div>
          <div className="perf-actions">
            <button
              className="ghost"
              onClick={() => onRunTest({ totalTx: 500, concurrency: 4 })}
              disabled={running}
            >
              500 tx / c4
            </button>
            <button
              className="ghost"
              onClick={() => onRunTest({ totalTx: 1000, concurrency: 8 })}
              disabled={running}
            >
              1000 tx / c8
            </button>
            <button
              className="ghost"
              onClick={() => onRunTest({ totalTx: 2000, concurrency: 16 })}
              disabled={running}
            >
              2000 tx / c16
            </button>
          </div>
        </div>
        <div className="perf-charts">
          <div className="chart">
            <div className="chart-title">TPS Trend</div>
            <div className="chart-bars">
              {trend.map((run) => (
                <div key={`${run.id}-tps`} className="chart-bar">
                  <span
                    className="bar"
                    style={{ height: `${(run.tps / maxTps) * 100}%` }}
                  />
                  <span className="bar-label">{formatTps(run.tps)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart">
            <div className="chart-title">p95 Latency</div>
            <div className="chart-bars">
              {trend.map((run) => (
                <div key={`${run.id}-p95`} className="chart-bar">
                  <span
                    className="bar warning"
                    style={{
                      height: `${((run.latency?.p95Ms || 0) / maxP95) * 100}%`,
                    }}
                  />
                  <span className="bar-label">
                    {formatMs(run.latency?.p95Ms || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <h3>Run History</h3>
        <div className="table-scroll">
          <table className="perf-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Total</th>
                <th>Success</th>
                <th>Failed</th>
                <th>Duration</th>
                <th>TPS</th>
                <th>p50</th>
                <th>p95</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan="8" className="muted">
                    No performance runs yet.
                  </td>
                </tr>
              )}
              {history.map((run) => (
                <tr key={run.id}>
                  <td>{new Date(run.id).toLocaleString()}</td>
                  <td>{run.totalTx}</td>
                  <td>{run.success}</td>
                  <td>{run.failed}</td>
                  <td>{formatMs(run.durationMs)}</td>
                  <td>{formatTps(run.tps)}</td>
                  <td>{formatMs(run.latency?.p50Ms || 0)}</td>
                  <td>{formatMs(run.latency?.p95Ms || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [result, setResult] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Response");
  const [perfHistory, setPerfHistory] = useState([]);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfError, setPerfError] = useState("");
  const [perfRunning, setPerfRunning] = useState(false);
  const [perfUpdatedAt, setPerfUpdatedAt] = useState("");

  const navItems = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "startup", label: "Startup" },
      { id: "investor", label: "Investor" },
      { id: "project", label: "Project" },
      { id: "validator", label: "Validator" },
      { id: "fund", label: "Funding" },
      { id: "settlement", label: "Settlement" },
      { id: "performance", label: "Performance" },
    ],
    [],
  );

  const [startupForm, setStartupForm] = useState({
    id: "sui1",
    name: "UI Startup",
    email: "ui@startup.com",
    panNumber: "PANS1",
    gstNumber: "GSTS1",
    incorporationDate: "2022-01-01",
    industry: "fintech",
    businessType: "product",
    country: "India",
    state: "MH",
    city: "Pune",
    website: "www.ui.com",
    description: "Demo startup",
    foundedYear: "2022",
    founderName: "Founder",
  });

  const [startupValidate, setStartupValidate] = useState({
    id: "sui1",
    decision: "APPROVED",
  });

  const [investorForm, setInvestorForm] = useState({
    id: "iui1",
    name: "UI Investor",
    email: "ui@investor.com",
    panNumber: "PANI1",
    aadharNumber: "AADHARI1",
    investorType: "angel",
    country: "India",
    state: "MH",
    city: "Mumbai",
    investmentFocus: "fintech",
    portfolioSize: "large",
    annualIncome: "1000000",
    organizationName: "",
  });

  const [investorValidate, setInvestorValidate] = useState({
    id: "iui1",
    decision: "APPROVED",
  });

  const [projectForm, setProjectForm] = useState({
    projectID: "pui1",
    startupID: "sui1",
    title: "UI Project",
    description: "Project from UI",
    goal: "100000",
    duration: "30",
    industry: "fintech",
    projectType: "equity",
    country: "India",
    targetMarket: "SMEs",
    currentStage: "mvp",
  });

  const [projectApprove, setProjectApprove] = useState({ projectID: "pui1" });
  const [fundForm, setFundForm] = useState({
    projectID: "pui1",
    investorID: "iui1",
    amount: "50000",
  });
  const [releaseForm, setReleaseForm] = useState({ projectID: "pui1" });
  const [refundForm, setRefundForm] = useState({
    projectID: "pui1",
    investorID: "iui1",
  });
  const [disputeForm, setDisputeForm] = useState({
    projectID: "pui1",
    investorID: "iui1",
    reason: "Milestone missed",
  });
  const [resolveForm, setResolveForm] = useState({
    projectID: "pui1",
    investorID: "iui1",
    resolution: "REFUND",
  });
  const [queryIds, setQueryIds] = useState({
    startupId: "sui1",
    investorId: "iui1",
    projectId: "pui1",
  });

  const callApi = async (path, method, body, title) => {
    setStatus({ type: "loading", message: "Processing request..." });
    setResult("");
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }
      setStatus({ type: "success", message: "Success" });
      setResult(JSON.stringify(data, null, 2));
      setModalTitle(title || "Response");
      setModalOpen(true);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
      setModalTitle("Error");
      setResult(JSON.stringify({ error: err.message }, null, 2));
      setModalOpen(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE}/health`);
        if (!cancelled) {
          setApiStatus(response.ok ? "online" : "offline");
        }
      } catch (err) {
        if (!cancelled) {
          setApiStatus("offline");
        }
      }
    };

    checkHealth();
    const timer = setInterval(checkHealth, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const fetchPerfHistory = async () => {
    setPerfLoading(true);
    setPerfError("");
    try {
      const response = await fetch(`${API_BASE}/perf/history`);
      if (!response.ok) {
        throw new Error("Unable to load performance history");
      }
      const data = await response.json();
      setPerfHistory(Array.isArray(data) ? data : []);
      setPerfUpdatedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setPerfError(err.message);
    } finally {
      setPerfLoading(false);
    }
  };

  useEffect(() => {
    fetchPerfHistory();
  }, []);

  const runPerfTest = async ({ totalTx, concurrency }) => {
    if (perfRunning) {
      return;
    }
    setPerfRunning(true);
    setPerfError("");
    try {
      const response = await fetch(`${API_BASE}/perf/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalTx, concurrency }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Performance run failed");
      }
      if (Array.isArray(data.history)) {
        setPerfHistory(data.history);
        setPerfUpdatedAt(new Date().toLocaleTimeString());
      } else {
        await fetchPerfHistory();
      }
    } catch (err) {
      setPerfError(err.message);
    } finally {
      setPerfRunning(false);
    }
  };

  return (
    <div className="app-shell">
      <ResponseModal
        open={modalOpen}
        title={modalTitle}
        body={result}
        onClose={() => setModalOpen(false)}
      />
      <Sidebar navItems={navItems} apiStatus={apiStatus} />

      <main className="content">
        <OverviewSection status={status} />
        <StartupSection
          startupForm={startupForm}
          setStartupForm={setStartupForm}
          startupValidate={startupValidate}
          setStartupValidate={setStartupValidate}
          queryIds={queryIds}
          setQueryIds={setQueryIds}
          callApi={callApi}
        />
        <InvestorSection
          investorForm={investorForm}
          setInvestorForm={setInvestorForm}
          investorValidate={investorValidate}
          setInvestorValidate={setInvestorValidate}
          queryIds={queryIds}
          setQueryIds={setQueryIds}
          callApi={callApi}
        />
        <ProjectSection
          projectForm={projectForm}
          setProjectForm={setProjectForm}
          queryIds={queryIds}
          setQueryIds={setQueryIds}
          callApi={callApi}
        />
        <ValidatorSection
          projectApprove={projectApprove}
          setProjectApprove={setProjectApprove}
          callApi={callApi}
        />
        <FundingSection
          fundForm={fundForm}
          setFundForm={setFundForm}
          result={result}
          callApi={callApi}
        />
        <SettlementSection
          releaseForm={releaseForm}
          setReleaseForm={setReleaseForm}
          refundForm={refundForm}
          setRefundForm={setRefundForm}
          disputeForm={disputeForm}
          setDisputeForm={setDisputeForm}
          resolveForm={resolveForm}
          setResolveForm={setResolveForm}
          callApi={callApi}
        />
        <PerformanceSection
          history={perfHistory}
          loading={perfLoading}
          error={perfError}
          running={perfRunning}
          lastUpdated={perfUpdatedAt}
          onRefresh={fetchPerfHistory}
          onRunTest={runPerfTest}
        />
      </main>
    </div>
  );
}

export default App;
