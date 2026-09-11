const fs = require('fs-extra');
const path = require('path');
const { getStartupGovContract, getInvestorInvestContract } = require('../gateway');

async function runPerfTest(count = 500) {
  console.log(`🚀 Starting Performance Test: ${count * 2} total transactions (${count} per channel)...`);
  const results = {
    timestamp: new Date().toISOString(),
    count,
    govLatencies: [],
    investLatencies: [],
    summary: {}
  };

  const BATCH_SIZE = 10; // Send 10 tx in parallel at a time

  try {
    const govContract = await getStartupGovContract();
    const investContract = await getInvestorInvestContract();

    // 1. Benchmark Gov Channel in parallel batches
    console.log(`--- Benchmarking Gov Channel (${count} tx in batches of ${BATCH_SIZE}) ---`);
    for (let batch = 0; batch < count; batch += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, count - batch);
      const batchStart = Date.now();
      const promises = Array.from({ length: batchSize }, (_, j) => {
        const i = batch + j + 1;
        const id = `perf_s_${Date.now()}_${i}`;
        return govContract.submitTransaction(
          'RegisterStartup',
          id, `Perf Startup ${i}`, `p${i}@test.com`, `PAN${i}X`, `GST${i}Y`,
          '2022-01-01', 'Tech', 'Pvt', 'India', 'KA', 'BLR', 'web.com', 'desc', '2022', 'Founder'
        ).then(() => Date.now() - batchStart).catch(() => -1);
      });
      const latencies = await Promise.all(promises);
      latencies.filter(l => l > 0).forEach(l => results.govLatencies.push(l));
      console.log(`  Gov Batch ${Math.floor(batch / BATCH_SIZE) + 1}/${Math.ceil(count / BATCH_SIZE)}: ${batchSize} tx done`);
    }

    // 2. Benchmark Invest Channel in parallel batches
    console.log(`--- Benchmarking Invest Channel (${count} tx in batches of ${BATCH_SIZE}) ---`);
    for (let batch = 0; batch < count; batch += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, count - batch);
      const batchStart = Date.now();
      const promises = Array.from({ length: batchSize }, (_, j) => {
        const i = batch + j + 1;
        const id = `perf_i_${Date.now()}_${i}`;
        return investContract.submitTransaction(
          'RegisterInvestor',
          id, `Perf Inv ${i}`, `i${i}@test.com`, `IPAN${i}`, '123456789012',
          'angel', 'India', 'KA', 'BLR', 'Tech', 'small', '1000000', 'Org'
        ).then(() => Date.now() - batchStart).catch(() => -1);
      });
      const latencies = await Promise.all(promises);
      latencies.filter(l => l > 0).forEach(l => results.investLatencies.push(l));
      console.log(`  Invest Batch ${Math.floor(batch / BATCH_SIZE) + 1}/${Math.ceil(count / BATCH_SIZE)}: ${batchSize} tx done`);
    }

    // Summarize
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const allLatencies = results.govLatencies.concat(results.investLatencies);
    results.summary = {
      avgGov:        avg(results.govLatencies).toFixed(2),
      avgInvest:     avg(results.investLatencies).toFixed(2),
      totalTime:     allLatencies.reduce((a, b) => a + b, 0),
      successCount:  allLatencies.length,
      totalRequested: count * 2
    };

    const filePath = path.join(__dirname, '../perf-results.json');
    await fs.writeJSON(filePath, results, { spaces: 2 });
    console.log(`✅ Done! ${allLatencies.length}/${count * 2} transactions succeeded.`);
    return results;
  } catch (error) {
    console.error('❌ Perf Test Failed:', error);
    throw error;
  }
}

module.exports = { runPerfTest };

if (require.main === module) {
  runPerfTest().then(() => process.exit(0)).catch(() => process.exit(1));
}
