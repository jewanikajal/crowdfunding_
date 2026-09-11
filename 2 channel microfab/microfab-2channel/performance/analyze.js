import autocannon from 'autocannon';
import fs from 'fs';

const API_BASE = 'http://localhost:3000';
const loads = [10, 50, 100];
const duration = '20';
const results = [];

async function runTest(endpoint, load) {
  const url = `${API_BASE}${endpoint}`;
  const title = `${endpoint.replace('/', '_')} at ${load} req/s`;

  return new Promise((resolve) => {
    autocannon({
      title,
      url,
      duration,
      rate: load,
      workers: 10,
      pipelining: 100,
      headers: {
        'Content-Type': 'application/json'
      },
      bodies: [
        '{"id":"perf_'+load+'","name":"Perf Test","email":"perf@test.com","panNumber":"PERF123","gstNumber":"GSTPERF","incorporationDate":"2024-01-01","industry":"Test","businessType":"Test","country":"Test","state":"Test","city":"Test","website":"test.com","description":"Perf test","foundedYear":"2024","founderName":"Perf"}'
      ]
    }, console.log).on('done', async (result) => {
      const tps = Math.round(result.tps);
      const latency = Math.round(result.latency.average);
      const success = ((result.requests.total - result.requests.non2xx - result.requests.errors.total) / result.requests.total * 100).toFixed(2);
      resolve({ load, tps, latency, success, timestamp: new Date().toISOString() });
    });
  });
}

(async () => {
  console.log('Running performance tests...');
  for (const load of loads) {
    console.log(`\\n--- Load: ${load} req/s ---`);
    const startupResult = await runTest('/api/startup/register', load);
    const investorResult = await runTest('/api/investor/register', load);
    const projectResult = await runTest('/api/project/create', load);
    
    results.push({ load, startup: startupResult, investor: investorResult, project: projectResult });
  }

  // Save raw results
  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
  console.log('\\nResults saved to results.json');
  console.log('Summary:', results.map(r => ({ load: r.load, avgTPS: Math.round((r.startup.tps + r.investor.tps + r.project.tps)/3) })));

  console.log('\\nOpen report.html to view charts');
})();

