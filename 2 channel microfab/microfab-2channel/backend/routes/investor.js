const express = require('express');
const router = express.Router();
const { getInvestorInvestContract, getStartupGovContract } = require('../gateway');

// POST /api/investor/register - Dual channel
router.post('/register', async (req, res) => {
  try {
    const { id, name, email, panNumber, aadharNumber, investorType, country, state, city, investmentFocus, portfolioSize, annualIncome, organizationName } = req.body;
    
    const args = [id, name, email, panNumber, aadharNumber, investorType, country, state, city, investmentFocus, portfolioSize.toString(), annualIncome.toString(), organizationName];
    
    const govContract = await getStartupGovContract(); // StartupOrg for gov
    const investContract = await getInvestorInvestContract();
    
    await govContract.submitTransaction('RegisterInvestor', ...args);
    await investContract.submitTransaction('RegisterInvestor', ...args);
    
    res.json({ success: true, message: `Investor ${id} registered on both channels` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/investor/validate - Dual
router.post('/validate', async (req, res) => {
  try {
    const { investorID, decision } = req.body;
    
    const govContract = await getStartupGovContract();
    const investContract = await getInvestorInvestContract();
    
    await govContract.submitTransaction('ValidateInvestor', investorID, decision);
    await investContract.submitTransaction('ValidateInvestor', investorID, decision);
    
    res.json({ success: true, message: `Investor ${investorID} ${decision}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/investor/:id
router.get('/:id', async (req, res) => {
  try {
    const contract = await getInvestorInvestContract();
    const result = await contract.evaluateTransaction('GetInvestor', req.params.id);
    
    res.json({ success: true, data: JSON.parse(result.toString()) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

