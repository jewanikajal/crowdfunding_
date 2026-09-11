const express = require('express');
const router = express.Router();
const { getValidatorGovContract, getInvestorInvestContract } = require('../gateway');

// POST /api/validator/register - Dual channel
router.post('/register', async (req, res) => {
  try {
    const { id, name, email, orgName, licenseNumber, country, state, specialization, yearsOfExperience } = req.body;
    
    const args = [id, name, email, orgName, licenseNumber, country, state, specialization, yearsOfExperience.toString()];
    
    const govContract = await getValidatorGovContract();
    const investContract = await getInvestorInvestContract();
    
    await govContract.submitTransaction('RegisterValidator', ...args);
    await investContract.submitTransaction('RegisterValidator', ...args);
    
    res.json({ success: true, message: `Validator ${id} registered on both channels` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

