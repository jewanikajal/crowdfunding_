const express = require('express');
const router = express.Router();
const { getInvestorInvestContract, getStartupGovContract } = require('../gateway');

// POST /api/dispute/raise
router.post('/raise', async (req, res) => {
  try {
    const { projectID, investorID, reason } = req.body;
    
    const contract = await getInvestorInvestContract();
    await contract.submitTransaction('RaiseDispute', projectID, investorID, reason);
    
    res.json({ success: true, message: `Dispute raised for ${projectID} by ${investorID}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/dispute/resolve
router.post('/resolve', async (req, res) => {
  try {
    const { projectID, investorID, resolution } = req.body; // "REFUND" or "DISMISS"

    // ResolveDispute only exists in investcc (investment-channel)
    // govcc does NOT have this function — calling it caused "dispute not found" errors
    const investContract = await getInvestorInvestContract();
    await investContract.submitTransaction('ResolveDispute', projectID, investorID, resolution);

    res.json({ success: true, message: `Dispute resolved for ${projectID}: ${resolution}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

