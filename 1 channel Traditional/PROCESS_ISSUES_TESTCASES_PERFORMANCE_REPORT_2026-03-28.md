# Crowdfunding Fabric Network - Process Issues, Test Case Share, and Performance Analysis

Date: 2026-03-28
Scope: End-to-end setup and testing evidence available in this workspace (single-channel and dual-channel scripts, result files, READMEs, and logs).

## 1) Executive Summary

This document consolidates the key issues faced during setup, validation, and performance testing of the Hyperledger Fabric crowdfunding network.

High-level outcome:
- The workflow eventually stabilized and completed the full 8-step single-channel transaction path.
- Early runs failed completely (0/20 success in multiple stages), then improved after environment and sequencing corrections.
- Final observed single-channel run quality was high: 159/160 successful transactions (99.38% overall) across 8 stages.
- Throughput remained low-to-moderate (roughly 0.31 to 0.38 TPS in stable runs), with average per-transaction latency in the 2.6s to 3.47s range.
- Privacy testing scripts explicitly document known data exposure issues (PAN/Aadhaar/annualIncome visibility in public state), indicating a design-level privacy gap rather than an execution glitch.

## 2) Evidence Sources Used

Primary artifacts reviewed:
- README and architecture/process docs:
  - README.md
  - README_2CHANNEL.md
- Single-channel performance scripts:
  - test_1_register_startup.sh ... test_8_release_funds.sh
- Advanced suites:
  - test-functional.sh
  - test-concurrency.sh
  - test-failure.sh
  - test-privacy.sh
  - test-security.sh
- Captured single-channel run outputs:
  - test1_register_startup_results_.txt
  - test1_register_startup_results_20260327_141423.txt
  - test1_register_startup_results_20260327_141705.txt
  - test1_register_startup_results_20260327_141840.txt
  - test1_register_startup_results_20260327_142244.txt
  - test2_validate_startup_results_20260327_141442.txt
  - test2_validate_startup_results_20260327_142344.txt
  - test3_register_investor_results_20260327_142444.txt
  - test4_validate_investor_results_20260327_142546.txt
  - test5_create_project_results_20260327_142648.txt
  - test6_approve_project_results_20260327_142751.txt
  - test7_fund_project_results_20260327_142850.txt
  - test8_release_funds_results_20260327_142943.txt
- Runtime notes:
  - log.txt

## 3) Process Timeline and Observed Maturity

### 3.1 Initial Failure Phase

Observed from result files:
- Multiple complete failures in early test runs:
  - Test 1 had several 20/20 failed runs with TPS 0 and 0% success.
  - Test 2 also had an early 20/20 failed run.

Interpretation:
- Environment and/or sequencing were not yet stable during first execution attempts.
- Since later runs succeeded strongly, root causes are likely operational setup issues (paths, environment variables, channel membership/context, readiness timing), not core logic impossibility.

### 3.2 Stabilization Phase

Later files show strong recovery:
- Test 1 improved to 19/20 success (95.00%).
- Test 2 through Test 8 reached 100% success in recorded runs.

Interpretation:
- Setup was corrected sufficiently for end-to-end transaction flow.
- Remaining occasional failure (1 in Test 1) is likely transient (network readiness, ordering delay, endorsement timeout/race) rather than persistent business-rule error.

## 4) Detailed Issues Faced (with Root Cause Hypotheses and Impact)

### Issue A - Early 0% success runs in core transaction flow

Symptoms:
- Several result files show Failed: 20/20, TPS: 0, Avg Latency: 0ms, Success Rate: 0%.

Likely contributors:
- Startup order and readiness gaps (peers/orderer/chaincode not fully ready).
- Environment variable context mismatch between org identities and invoked operations.
- Single-channel scripts require all four endorsements per invoke, increasing sensitivity to any unavailable peer.

Impact:
- Full workflow blocked in early iterations.
- Required repeated reruns before usable metrics could be collected.

Mitigation used/observed:
- Re-run after corrections led to successful completion from Test 2 onward.
- Scripted sequential execution helped enforce dependency order.

Recommended hardening:
- Add pre-flight checks before each batch (peer reachability, chaincode committed check, channel joined checks).
- Abort fast with actionable error messages instead of silent failures.

### Issue B - Diagnostic blind spots due to stderr suppression

Symptoms in scripts:
- Most invokes redirect stderr to /dev/null in loops.

Impact:
- Real failure reasons are hidden during load loops.
- Failures are counted but not explained, increasing troubleshooting time.

Mitigation recommendation:
- Capture stderr per failed transaction to a debug log file (with transaction index and function name).
- Add optional DEBUG=1 mode to print raw peer errors.

### Issue C - Cross-platform path/runtime portability problems (Windows vs Linux/WSL assumptions)

Observed cues:
- Test scripts are bash-based and rely on Linux-like tooling.
- Dual-channel scripts hardcode BASE to a developer-specific WSL path (/mnt/c/Users/riyaf/...).
- Existing repo runtime note already flags Git Bash/Windows binary path incompatibility and recommends WSL2/Linux.

Impact:
- Scripts can fail immediately on another machine even before Fabric transaction logic is exercised.

Mitigation recommendation:
- Derive BASE dynamically from script location (e.g., SCRIPT_DIR and PROJECT_ROOT).
- Remove developer-specific hardcoded absolute paths.
- Document a single supported runtime matrix (WSL2 Ubuntu recommended).

### Issue D - Performance metric instrumentation fragility

Symptoms:
- One output file has malformed success rate line: Success Rate: %.

Likely cause:
- Calculation dependency/tooling mismatch (for example bc availability or expression failure).

Impact:
- Metrics become partially unusable for comparison dashboards.

Mitigation recommendation:
- Validate metric calculation commands at script start.
- Provide fallback using awk or integer arithmetic when bc is missing.

### Issue E - Privacy design limitations acknowledged by test suite

Explicitly documented in privacy suite comments:
- Expected 8/11 pass; known failures include exposure of Aadhaar, PAN, and annualIncome.

Interpretation:
- This is a known design-level privacy limitation in current chaincode/state model, not a random flake.

Impact:
- Sensitive data visibility risk in public world state.
- Compliance and trust concerns for production readiness.

Mitigation recommendation:
- Move sensitive fields to Private Data Collections.
- Store only hashed or tokenized references in public state.
- Add field-level response redaction in query functions.

### Issue F - Role security relies heavily on channel/endorsement policy

Security test observations:
- Security script expects pass when unauthorized orgs are blocked by channel access or endorsement policy.
- Script comment notes a potential gap: caller MSP identity enforcement may not be explicit in chaincode logic for some actions.

Impact:
- If policy changes or single-peer invocation patterns are introduced incorrectly, role checks may weaken.

Mitigation recommendation:
- Add explicit chaincode-level role checks using client identity (MSP/cert attributes), not policy-only reliance.
- Keep policy and chaincode auth defense-in-depth aligned.

### Issue G - Sequential dependency sensitivity

Observed by design:
- 8-step workflow is strictly ordered; each stage depends on prior entity state (approved startup/investor, approved project before funding, funded status before release).

Impact:
- Any earlier-stage failure cascades downstream and can create false negatives in later tests.

Mitigation recommendation:
- Add stage gate checks and explicit preconditions before executing each test script.
- Auto-skip downstream stages with clear reason if prerequisites are unmet.

## 5) Single-Channel Test Case Share (Executed and Captured)

Each script executes 20 transactions and records failed count, TPS, average latency, and success rate.

### Test Case Matrix (Single Channel)

1. Test 1 - RegisterStartup (Org1)
- Purpose: Register startups S100-S119.
- Inputs: startup identity and profile fields.
- Expected: successful registration for each unique startup ID.
- Observed history: multiple early 0/20 runs, later 19/20 (95.00%).

2. Test 2 - ValidateStartup (Org3)
- Purpose: Validator approval of S100-S119.
- Expected: only validator context approves.
- Observed history: early 0/20 run, later 20/20 (100%).

3. Test 3 - RegisterInvestor (Org2)
- Purpose: Register investors I100-I119.
- Expected: registration succeeds with valid data.
- Observed: 20/20 (100%).

4. Test 4 - ValidateInvestor (Org3)
- Purpose: Validator approval for investors.
- Observed: 20/20 (100%).

5. Test 5 - CreateProject (Org1)
- Purpose: Create projects P100-P119 from approved startups.
- Observed: 20/20 (100%).

6. Test 6 - ApproveProject (Org3)
- Purpose: Validator approves projects.
- Observed: 20/20 (100%).

7. Test 7 - Fund (Org2)
- Purpose: Investor funds projects.
- Test data uses amount 2,000,000 for goal 1,000,000 (single-tx funding).
- Observed: 20/20 (100%).

8. Test 8 - ReleaseFunds (Org4)
- Purpose: Platform releases funds on funded projects.
- Observed: 20/20 (100%).

### Aggregated Single-Channel Outcome from Recorded Files

From the final successful sequence (Test1 late run + Tests2-8):
- Total attempted tx: 160
- Total succeeded: 159
- Total failed: 1
- Overall success rate: 99.38%

## 6) Advanced Suite Coverage Share (From Script Definitions)

Note: CSV artifacts for these suites were not found in current workspace snapshot, so values below are expected targets documented in scripts.

### Functional Suite (test-functional.sh)

Declared expectation:
- Expected 13/14 pass.
- Known expected failure note: refund-flow edge case aligned with microfab behavior.

Coverage areas:
- Duplicate registration blocking.
- Income threshold validation.
- Reject flow and state transitions.
- Invalid amount handling.
- Refund and dispute logic.
- Unvalidated entity gating.

### Privacy Suite (test-privacy.sh)

Declared expectation:
- Expected 8/11 pass.
- Known expected failures:
  - Aadhar visible in public state.
  - PAN visible in public state.
  - annualIncome visible in public state.

Coverage areas:
- Channel isolation.
- Public-state leakage checks.
- Cross-channel separation.
- Org boundary checks.
- Approval-hash integrity checks.

### Security Suite (test-security.sh)

Declared expectation:
- Expected 6/6 pass.

Coverage areas:
- Unauthorized project approval attempts.
- Self-validation attempt behavior.
- Non-existent resource protection.
- Invalid release conditions.
- Dispute mechanism availability.
- Direct gov-channel access denial for non-member org.

### Failure and Recovery Suite (test-failure.sh)

Declared expectation:
- Expected 9/9 pass.

Coverage areas:
- Funding closed/released project rejection.
- Double-release rejection.
- Refund precondition enforcement.
- Duplicate approval rejection.
- Query non-existent entities.
- Non-existent dispute resolution rejection.
- Invalid project creation dependencies.

### Concurrency Suite (test-concurrency.sh)

Declared expectation:
- Expected 3/3 pass.

Coverage areas:
- Parallel project creation.
- Parallel funding against shared state.
- Parallel validations.

Important concurrency note in script:
- MVCC conflicts are expected behavior in Fabric under concurrent writes.

## 7) Performance Analysis

## 7.1 Stage-wise Stable Run Metrics (from timestamped result files)

- Test 1 RegisterStartup: TPS 0.28, Avg Latency 3473.68 ms, Success 95.00%
- Test 2 ValidateStartup: TPS 0.33, Avg Latency 3000.00 ms, Success 100.00%
- Test 3 RegisterInvestor: TPS 0.33, Avg Latency 3000.00 ms, Success 100.00%
- Test 4 ValidateInvestor: TPS 0.32, Avg Latency 3100.00 ms, Success 100.00%
- Test 5 CreateProject: TPS 0.32, Avg Latency 3100.00 ms, Success 100.00%
- Test 6 ApproveProject: TPS 0.31, Avg Latency 3150.00 ms, Success 100.00%
- Test 7 FundProject: TPS 0.33, Avg Latency 2950.00 ms, Success 100.00%
- Test 8 ReleaseFunds: TPS 0.38, Avg Latency 2600.00 ms, Success 100.00%

## 7.2 Consolidated Numbers (Stable Sequence)

- Mean TPS across 8 stages: approximately 0.33 TPS
- Mean latency across 8 stages: approximately 3046.71 ms
- Fastest stage observed: ReleaseFunds (~2600 ms)
- Slowest stage observed: RegisterStartup (~3473.68 ms)

## 7.3 Interpretation

- The system is functionally stable after setup corrections, but throughput is low due to:
  - strict multi-org endorsement requirements,
  - sequential invoke pattern in scripts,
  - deliberate sleep and commit wait behavior in some suites,
  - and likely local resource constraints.
- Latency consistency around ~3s suggests predictable commit path under current test load.

## 8) Key Risks and Gaps for Production Readiness

1. Privacy risk
- Sensitive identity/financial fields exposed in public state per known privacy suite findings.

2. Operability risk
- Hardcoded paths and OS assumptions reduce reproducibility across developer machines.

3. Observability risk
- Stderr suppression hides root causes during failures.

4. Authorization hardening gap
- Policy-level controls are strong, but some comments indicate caller-MSP checks should be explicit in chaincode for defense in depth.

5. Benchmark depth gap
- Current performance tests are small-batch and mostly sequential; no sustained load profile, percentile latency, or resource telemetry included.

## 9) Recommended Improvement Plan

### Immediate (P0)

1. Remove hardcoded BASE paths in dual-channel scripts.
2. Add pre-flight readiness checks (peer/orderer/chaincode/channel).
3. Stop suppressing invoke errors in batch loops; store per-tx diagnostics.
4. Standardize runtime to WSL2/Linux in docs and scripts.

### Near-term (P1)

1. Implement Private Data Collections for PAN/Aadhaar/annualIncome.
2. Add explicit chaincode identity checks for role-gated functions.
3. Add automated dependency checks between stage scripts.

### Medium-term (P2)

1. Build a repeatable benchmark harness with:
- warm-up period,
- N-run averages,
- p50/p95 latency,
- container CPU/memory snapshots,
- and separate endorsement/commit timing where possible.
2. Add CI execution for core negative suites (security/failure/privacy).

## 10) Appendix - Quick Result Snapshot

Early instability snapshot:
- test1_register_startup_results_20260327_141423.txt: Failed 20/20, TPS 0, Success 0%
- test1_register_startup_results_20260327_141705.txt: Failed 20/20, TPS 0, Success 0%
- test1_register_startup_results_20260327_141840.txt: Failed 20/20, TPS 0, Success 0%
- test2_validate_startup_results_20260327_141442.txt: Failed 20/20, TPS 0, Success 0%

Recovered stable snapshot:
- test1_register_startup_results_20260327_142244.txt: Failed 1/20, TPS 0.28, Success 95.00%
- test2_validate_startup_results_20260327_142344.txt: Failed 0/20, TPS 0.33, Success 100.00%
- test3_register_investor_results_20260327_142444.txt: Failed 0/20, TPS 0.33, Success 100.00%
- test4_validate_investor_results_20260327_142546.txt: Failed 0/20, TPS 0.32, Success 100.00%
- test5_create_project_results_20260327_142648.txt: Failed 0/20, TPS 0.32, Success 100.00%
- test6_approve_project_results_20260327_142751.txt: Failed 0/20, TPS 0.31, Success 100.00%
- test7_fund_project_results_20260327_142850.txt: Failed 0/20, TPS 0.33, Success 100.00%
- test8_release_funds_results_20260327_142943.txt: Failed 0/20, TPS 0.38, Success 100.00%

---

Prepared as a documentation artifact for sharing project testing outcomes, issues encountered, and performance characteristics.
