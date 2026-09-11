const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
const startupRoutes = require('./routes/startup');
const investorRoutes = require('./routes/investor');
const validatorRoutes = require('./routes/validator');
const projectRoutes = require('./routes/project');
const investmentRoutes = require('./routes/investment');
const disputeRoutes = require('./routes/dispute');
const { runPerfTest } = require('./scripts/perf-test');

app.use('/api/startup', startupRoutes);
app.use('/api/investor', investorRoutes);
app.use('/api/validator', validatorRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/dispute', disputeRoutes);

// Performance Test API
app.get('/api/performance/run', async (req, res) => {
  try {
    const results = await runPerfTest(500); // 500 tx per channel = 1000 total transactions
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/performance/results', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'perf-results.json');
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJSON(filePath);
      res.json({ success: true, data });
    } else {
      res.json({ success: false, message: 'No results yet' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), port: PORT });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Backend API running on http://127.0.0.1:${PORT}`);
  console.log(`📊 Health check: http://127.0.0.1:${PORT}/api/health`);
});

module.exports = app;

