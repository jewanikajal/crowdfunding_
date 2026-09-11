const express = require('express');
const router = express.Router();
const { getStartupGovContract, getInvestorInvestContract } = require('../gateway');

// POST /api/startup/register — writes to BOTH channels
router.post('/register', async (req, res) => {
  try {
    const contract = await getStartupGovContract();
    const {
      id, name, email, panNumber, gstNumber, incorporationDate,
      industry, businessType, country, state, city,
      website, description, foundedYear, founderName
    } = req.body;

    const args = [
      id, name, email, panNumber, gstNumber, incorporationDate,
      industry, businessType, country, state, city,
      website, description, foundedYear.toString(), founderName
    ];

    // Register on gov channel
    const govContract = await getStartupGovContract();
    await govContract.submitTransaction('RegisterStartup', ...args);

    // Mirror on investment channel
    const investContract = await getInvestorInvestContract();
    await investContract.submitTransaction('RegisterStartup', ...args);

    res.json({ success: true, message: `Startup ${id} registered on both channels` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/startup/validate — validates on BOTH channels
router.post('/validate', async (req, res) => {
  try {
    const { startupID, decision } = req.body;

    const govContract = await getStartupGovContract();
    await govContract.submitTransaction('ValidateStartup', startupID, decision);

    // Mirror validation on investment channel
    const investContract = await getInvestorInvestContract();
    await investContract.submitTransaction('ValidateStartup', startupID, decision);

    res.json({ success: true, message: `Startup ${startupID} ${decision.toLowerCase()} on both channels` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/startup/:id
router.get('/:id', async (req, res) => {
  try {
    const contract = await getStartupGovContract();
    const result = await contract.evaluateTransaction('GetStartup', req.params.id);
    res.json({ success: true, data: JSON.parse(result.toString()) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
