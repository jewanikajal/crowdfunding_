const express = require('express');
const router = express.Router();
const { getInvestorInvestContract } = require('../gateway');

// POST /api/investment/fund
router.post('/fund', async (req, res) => {
  try {
    const { projectID, investorID, amount } = req.body;
    
    const contract = await getInvestorInvestContract();
    await contract.submitTransaction('Fund', projectID, investorID, amount.toString());
    
    res.json({ success: true, message: `Funded ${amount} to project ${projectID}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/investment/release
router.post('/release', async (req, res) => {
  try {
    const { projectID } = req.body;
    
    const contract = await getInvestorInvestContract();
    await contract.submitTransaction('ReleaseFunds', projectID);
    
    res.json({ success: true, message: `Funds released for ${projectID}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/investment/refund
router.post('/refund', async (req, res) => {
  try {
    const { projectID, investorID } = req.body;
    
    const contract = await getInvestorInvestContract();
    await contract.submitTransaction('Refund', projectID, investorID);
    
    res.json({ success: true, message: `Refunded investor ${investorID} for ${projectID}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

