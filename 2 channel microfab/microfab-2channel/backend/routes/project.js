const express = require('express');
const router = express.Router();
const { getStartupGovContract, getValidatorGovContract, getInvestorInvestContract } = require('../gateway');

// POST /api/project/create - Dual
router.post('/create', async (req, res) => {
  try {
    const { projectID, startupID, title, description, goal, duration, industry, projectType, country, targetMarket, currentStage } = req.body;
    
    const args = [projectID, startupID, title, description, goal.toString(), duration.toString(), industry, projectType, country, targetMarket, currentStage];
    
    const govContract = await getStartupGovContract();
    const investContract = await getInvestorInvestContract();
    
    await govContract.submitTransaction('CreateProject', ...args);
    await investContract.submitTransaction('CreateProject', ...args);
    
    res.json({ success: true, message: `Project ${projectID} created on both channels` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/project/approve - Gov → get hash → Invest
router.post('/approve', async (req, res) => {
  try {
    const { projectID } = req.body;
    
    const govContract = await getValidatorGovContract(); // Validator approves
    await govContract.submitTransaction('ApproveProject', projectID);
    
    // Get approvalHash from gov
    const govResult = await govContract.evaluateTransaction('GetProject', projectID);
    const projectGov = JSON.parse(govResult.toString());
    const approvalHash = projectGov.approvalHash;
    
    // Approve on invest with hash
    const investContract = await getInvestorInvestContract();
    await investContract.submitTransaction('ApproveProject', projectID, approvalHash);
    
    res.json({ success: true, message: `Project ${projectID} approved on both channels`, approvalHash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/project/reject - Dual
router.post('/reject', async (req, res) => {
  try {
    const { projectID } = req.body;
    
    const govContract = await getValidatorGovContract();
    const investContract = await getInvestorInvestContract();
    
    await govContract.submitTransaction('RejectProject', projectID);
    await investContract.submitTransaction('RejectProject', projectID);
    
    res.json({ success: true, message: `Project ${projectID} rejected` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/project/:id
router.get('/:id', async (req, res) => {
  try {
    const contract = await getInvestorInvestContract(); // Investment ledger
    const result = await contract.evaluateTransaction('GetProject', req.params.id);
    
    res.json({ success: true, data: JSON.parse(result.toString()) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

