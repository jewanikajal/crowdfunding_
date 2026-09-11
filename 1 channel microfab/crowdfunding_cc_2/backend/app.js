const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { getContract } = require('./fabric');

const app = express();
app.use(bodyParser.json());
app.use(cors());

/* =====================================================
   CHANNEL 1 — GOVERNANCE (gov-validation-channel)
===================================================== */

/* ---------- Create Campaign (Startup) ---------- */
app.post('/campaign', async (req,res)=>{
  let gateway;
  try{
    const { id,name,startupId,desc,goal } = req.body;

    const conn = await getContract(
      'gov-validation-channel',
      'governancecc',
      'StartupOrg',
      'startuporgadmin'
    );
    gateway = conn.gateway;

    await conn.contract.submitTransaction(
      'CreateCampaign',
      id,name,startupId,desc,String(goal)
    );

    res.send("✅ Campaign created");

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* ---------- Submit For Validation ---------- */
app.post('/submitValidation', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'gov-validation-channel','governancecc',
      'StartupOrg','startuporgadmin'
    );
    gateway = conn.gateway;

    await conn.contract.submitTransaction(
      'SubmitForValidation',
      req.body.id
    );

    res.send("✅ Sent for validation");

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* ---------- Validator Scores ---------- */

app.post('/setRisk', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'gov-validation-channel','governancecc',
      'ValidatorOrg','validatororgadmin'
    );
    gateway = conn.gateway;

    await conn.contract.submitTransaction(
      'SetRiskScore',
      req.body.id,
      String(req.body.score)
    );

    res.send("✅ Risk score set");

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


app.post('/setCompliance', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'gov-validation-channel','governancecc',
      'ValidatorOrg','validatororgadmin'
    );
    gateway = conn.gateway;

    await conn.contract.submitTransaction(
      'SetComplianceScore',
      req.body.id,
      String(req.body.score)
    );

    res.send("✅ Compliance score set");

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* ---------- Approve Campaign ---------- */
app.post('/approveCampaign', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'gov-validation-channel','governancecc',
      'ValidatorOrg','validatororgadmin'
    );
    gateway = conn.gateway;

    const result = await conn.contract.submitTransaction(
      'ApproveCampaign',
      req.body.id
    );

    res.json({ approvalHash: result.toString() });

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* ---------- Milestones ---------- */

app.post('/milestone', async (req,res)=>{
  let gateway;
  try{
    const {id,campaignId,title,proof} = req.body;

    const conn = await getContract(
      'gov-validation-channel','governancecc',
      'StartupOrg','startuporgadmin'
    );
    gateway = conn.gateway;

    await conn.contract.submitTransaction(
      'SubmitMilestone',
      id,campaignId,title,proof
    );

    res.send("✅ Milestone submitted");

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


app.post('/approveMilestone', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'gov-validation-channel','governancecc',
      'ValidatorOrg','validatororgadmin'
    );
    gateway = conn.gateway;

    const hash = await conn.contract.submitTransaction(
      'ApproveMilestone',
      req.body.id
    );

    res.json({ milestoneHash: hash.toString() });

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* ---------- Query Campaign ---------- */
app.get('/campaign/:id', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'gov-validation-channel','governancecc',
      'StartupOrg','startuporgadmin'
    );
    gateway = conn.gateway;

    const data = await conn.contract.evaluateTransaction(
      'GetCampaign',
      req.params.id
    );

    res.json(JSON.parse(data.toString()));

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* ---------- Deletion Fee Preview ---------- */
app.get('/fee/campaign/:id', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'gov-validation-channel','governancecc',
      'StartupOrg','startuporgadmin'
    );
    gateway = conn.gateway;

    const data = await conn.contract.evaluateTransaction(
      'CalculateCampaignDeletionFee',
      req.params.id
    );

    res.json(JSON.parse(data.toString()));

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* =====================================================
   CHANNEL 2 — INVESTMENT (investment-execution-channel)
===================================================== */

/* ---------- Create Wallet ---------- */
app.post('/wallet', async (req,res)=>{
  let gateway;
  try{
    const {id,owner,type,balance} = req.body;

    const conn = await getContract(
      'investment-execution-channel',
      'investmentcc',
      'PlatformOrg',
      'platformorgadmin'
    );
    gateway = conn.gateway;

    await conn.contract.submitTransaction(
      'CreateWallet',
      id,owner,type,String(balance)
    );

    res.send("✅ Wallet created");

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* ---------- Query Wallet ---------- */
app.get('/wallet/:id', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'investment-execution-channel',
      'investmentcc',
      'PlatformOrg',
      'platformorgadmin'
    );
    gateway = conn.gateway;

    const data = await conn.contract.evaluateTransaction(
      'ReadWallet',
      req.params.id
    );

    res.json(JSON.parse(data.toString()));

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* ---------- Invest Funds ---------- */
/* ⭐ includes fundsRaised sync */
app.post('/invest', async (req,res)=>{
  let gw1, gw2;
  try{
    const {invId,campaignId,investorId,amount,approvalHash} = req.body;

    // channel 2 — record investment
    const c2 = await getContract(
      'investment-execution-channel',
      'investmentcc',
      'InvestorOrg',
      'investororgadmin'
    );
    gw2 = c2.gateway;

    await c2.contract.submitTransaction(
      'InvestFunds',
      invId,campaignId,investorId,String(amount),approvalHash
    );

    // ⭐ channel 1 — update fundsRaised
    const c1 = await getContract(
      'gov-validation-channel',
      'governancecc',
      'PlatformOrg',
      'platformorgadmin'
    );
    gw1 = c1.gateway;

    await c1.contract.submitTransaction(
      'AddFundsRaised',
      campaignId,
      String(amount)
    );

    res.send("✅ Investment recorded + funds synced");

  }catch(e){ res.status(500).send(e.message); }
  finally {
    if(gw1) gw1.disconnect();
    if(gw2) gw2.disconnect();
  }
});


/* ---------- Release Funds ---------- */
app.post('/release', async (req,res)=>{
  let gateway;
  try{
    const {invId,startupId,milestoneHash} = req.body;

    const conn = await getContract(
      'investment-execution-channel',
      'investmentcc',
      'PlatformOrg',
      'platformorgadmin'
    );
    gateway = conn.gateway;

    await conn.contract.submitTransaction(
      'ReleaseFunds',
      invId,startupId,milestoneHash
    );

    res.send("✅ Funds released");

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});


/* ---------- Refund ---------- */
app.post('/refund', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'investment-execution-channel',
      'investmentcc',
      'ValidatorOrg',
      'validatororgadmin'
    );
    gateway = conn.gateway;

    await conn.contract.submitTransaction(
      'RefundInvestor',
      req.body.invId
    );

    res.send("✅ Refunded");

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});

app.post('/deleteCampaign', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'gov-validation-channel',
      'governancecc',
      'StartupOrg',
      'startuporgadmin'
    );
    gateway = conn.gateway;

    await conn.contract.submitTransaction(
      'DeleteCampaign',
      req.body.id,
      req.body.reason
    );

    res.send("✅ Campaign deleted");

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});

app.get('/investment/:id', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'investment-execution-channel',
      'investmentcc',
      'PlatformOrg',
      'platformorgadmin'
    );
    gateway = conn.gateway;

    const data = await conn.contract.evaluateTransaction(
      'ReadInvestment',
      req.params.id
    );

    res.json(JSON.parse(data.toString()));

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});

app.get('/history/:id', async (req,res)=>{
  let gateway;
  try{
    const conn = await getContract(
      'gov-validation-channel',
      'governancecc',
      'PlatformOrg',
      'platformorgadmin'
    );
    gateway = conn.gateway;

    const data = await conn.contract.evaluateTransaction(
      'GetHistory',
      req.params.id
    );

    res.json(JSON.parse(data.toString()));

  }catch(e){ res.status(500).send(e.message); }
  finally { if(gateway) gateway.disconnect(); }
});



/* ===================================================== */

app.listen(3000, ()=>{
  console.log("🚀 Backend running on port 3000");
});
