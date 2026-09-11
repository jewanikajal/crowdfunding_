package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type GovernanceContract struct {
	contractapi.Contract
}

/* =========================================================
   ===================== MODELS ============================
========================================================= */

type Campaign struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	StartupID       string `json:"startupId"`
	Description     string `json:"description"`
	GoalAmount      int    `json:"goalAmount"`
	FundsRaised     int    `json:"fundsRaised"`
	Status          string `json:"status"`
	RiskScore       int    `json:"riskScore"`
	ComplianceScore int    `json:"complianceScore"`
	ApprovalHash    string `json:"approvalHash"`
	CreatedAt       string `json:"createdAt"`
	Deleted         bool   `json:"deleted"`
}

type ValidationRecord struct {
	CampaignID string `json:"campaignId"`
	Validator  string `json:"validator"`
	Decision   string `json:"decision"`
	Notes      string `json:"notes"`
	Timestamp  string `json:"timestamp"`
}

type Milestone struct {
	ID           string `json:"id"`
	CampaignID   string `json:"campaignId"`
	Title        string `json:"title"`
	ProofHash    string `json:"proofHash"`
	Status       string `json:"status"`
	ApprovedHash string `json:"approvedHash"`
}

type DeletionFeePreview struct {
	EntityId      string `json:"entityId"`
	EntityType    string `json:"entityType"`
	FundsRaised   int    `json:"fundsRaised"`
	FeeAmount     int    `json:"feeAmount"`
	FeePercentage int    `json:"feePercentage"`
	IsFixedFee    bool   `json:"isFixedFee"`
}

/* =========================================================
   ===================== HELPERS ===========================
========================================================= */

func hashString(input string) string {
	h := sha256.Sum256([]byte(input))
	return hex.EncodeToString(h[:])
}

func getMSP(ctx contractapi.TransactionContextInterface) (string, error) {
	return ctx.GetClientIdentity().GetMSPID()
}

/* =========================================================
   ================= CAMPAIGN FLOW =========================
========================================================= */

func (g *GovernanceContract) CreateCampaign(
	ctx contractapi.TransactionContextInterface,
	id, name, startupId, desc string,
	goal int,
) error {

	if b, _ := ctx.GetStub().GetState(id); b != nil {
		return fmt.Errorf("campaign already exists")
	}

	c := Campaign{
		ID:          id,
		Name:        name,
		StartupID:   startupId,
		Description: desc,
		GoalAmount:  goal,
		Status:      "SUBMITTED",
		CreatedAt:   time.Now().Format(time.RFC3339),
	}

	js, _ := json.Marshal(c)
	return ctx.GetStub().PutState(id, js)
}

func (g *GovernanceContract) GetCampaign(
	ctx contractapi.TransactionContextInterface,
	id string,
) (*Campaign, error) {

	b, err := ctx.GetStub().GetState(id)
	if err != nil || b == nil {
		return nil, fmt.Errorf("campaign not found")
	}

	var c Campaign
	json.Unmarshal(b, &c)
	return &c, nil
}

/* =========================================================
   ================= VALIDATION FLOW =======================
========================================================= */

func (g *GovernanceContract) SubmitForValidation(
	ctx contractapi.TransactionContextInterface,
	id string,
) error {

	c, err := g.GetCampaign(ctx, id)
	if err != nil {
		return err
	}

	if c.Status != "SUBMITTED" {
		return fmt.Errorf("invalid state")
	}

	c.Status = "UNDER_VALIDATION"
	js, _ := json.Marshal(c)
	return ctx.GetStub().PutState(id, js)
}

func (g *GovernanceContract) RecordValidation(
	ctx contractapi.TransactionContextInterface,
	campaignId, validator, decision, notes string,
) error {

	msp, _ := getMSP(ctx)
	if msp != "ValidatorOrgMSP" {
		return fmt.Errorf("only validator allowed")
	}

	rec := ValidationRecord{
		CampaignID: campaignId,
		Validator:  validator,
		Decision:   decision,
		Notes:      notes,
		Timestamp:  time.Now().Format(time.RFC3339),
	}

	key := "VAL_" + campaignId + "_" + validator
	js, _ := json.Marshal(rec)
	return ctx.GetStub().PutState(key, js)
}

/* =========================================================
   ================= SCORING ===============================
========================================================= */

func (g *GovernanceContract) SetRiskScore(
	ctx contractapi.TransactionContextInterface,
	id string,
	score int,
) error {

	msp, _ := getMSP(ctx)
	if msp != "ValidatorOrgMSP" {
		return fmt.Errorf("validator only")
	}

	c, err := g.GetCampaign(ctx, id)
	if err != nil {
		return err
	}

	c.RiskScore = score
	js, _ := json.Marshal(c)
	return ctx.GetStub().PutState(id, js)
}

func (g *GovernanceContract) SetComplianceScore(
	ctx contractapi.TransactionContextInterface,
	id string,
	score int,
) error {

	msp, _ := getMSP(ctx)
	if msp != "ValidatorOrgMSP" {
		return fmt.Errorf("validator only")
	}

	c, err := g.GetCampaign(ctx, id)
	if err != nil {
		return err
	}

	c.ComplianceScore = score
	js, _ := json.Marshal(c)
	return ctx.GetStub().PutState(id, js)
}

/* =========================================================
   ================= APPROVAL ==============================
========================================================= */

func (g *GovernanceContract) ApproveCampaign(
	ctx contractapi.TransactionContextInterface,
	id string,
) (string, error) {

	msp, _ := getMSP(ctx)
	if msp != "ValidatorOrgMSP" {
		return "", fmt.Errorf("validator only")
	}

	c, err := g.GetCampaign(ctx, id)
	if err != nil {
		return "", err
	}

	if c.RiskScore == 0 || c.ComplianceScore == 0 {
		return "", fmt.Errorf("scores missing")
	}

	hashInput := fmt.Sprintf("%s|%d|%d|%s",
		id, c.RiskScore, c.ComplianceScore, time.Now().String())

	c.Status = "APPROVED"
	c.ApprovalHash = hashString(hashInput)

	js, _ := json.Marshal(c)
	ctx.GetStub().PutState(id, js)

	return c.ApprovalHash, nil
}

func (g *GovernanceContract) RejectCampaign(
	ctx contractapi.TransactionContextInterface,
	id string,
) error {

	c, err := g.GetCampaign(ctx, id)
	if err != nil {
		return err
	}

	c.Status = "REJECTED"
	js, _ := json.Marshal(c)
	return ctx.GetStub().PutState(id, js)
}

/* =========================================================
   ================= MILESTONES ============================
========================================================= */

func (g *GovernanceContract) SubmitMilestone(
	ctx contractapi.TransactionContextInterface,
	id, campaignId, title, proof string,
) error {

	m := Milestone{
		ID:         id,
		CampaignID: campaignId,
		Title:      title,
		ProofHash:  hashString(proof),
		Status:     "SUBMITTED",
	}

	js,_ := json.Marshal(m)
	return ctx.GetStub().PutState(id, js)
}

func (g *GovernanceContract) ApproveMilestone(
	ctx contractapi.TransactionContextInterface,
	id string,
) (string, error) {

	msp,_ := getMSP(ctx)
	if msp != "ValidatorOrgMSP" {
		return "", fmt.Errorf("validator only")
	}

	b,_ := ctx.GetStub().GetState(id)
	if b == nil {
		return "", fmt.Errorf("milestone missing")
	}

	var m Milestone
	json.Unmarshal(b,&m)

	m.Status = "APPROVED"
	m.ApprovedHash = hashString(id + time.Now().String())

	js,_ := json.Marshal(m)
	ctx.GetStub().PutState(id, js)

	return m.ApprovedHash, nil
}

/* =========================================================
   ================= DELETION FEES =========================
========================================================= */

func (g *GovernanceContract) CalculateCampaignDeletionFee(
	ctx contractapi.TransactionContextInterface,
	id string,
) (*DeletionFeePreview,error){

	c,_ := g.GetCampaign(ctx,id)

	p := DeletionFeePreview{
		EntityId: id,
		EntityType: "CAMPAIGN",
		FundsRaised: c.FundsRaised,
	}

	if c.FundsRaised == 0 {
		p.FeeAmount = 100
		p.IsFixedFee = true
	} else {
		p.FeeAmount = (c.FundsRaised * 60)/100
		p.FeePercentage = 60
	}

	return &p,nil
}

func (g *GovernanceContract) DeleteCampaign(
	ctx contractapi.TransactionContextInterface,
	id, reason string,
) error {

	c,_ := g.GetCampaign(ctx,id)

	p,_ := g.CalculateCampaignDeletionFee(ctx,id)

	c.Status = "DELETED"
	c.Deleted = true

	js,_ := json.Marshal(c)
	ctx.GetStub().PutState(id, js)

	rec := map[string]interface{}{
		"id": id,
		"reason": reason,
		"fee": p.FeeAmount,
		"time": time.Now().String(),
	}

	rj,_ := json.Marshal(rec)
	return ctx.GetStub().PutState("DEL_"+id,rj)
}

/* =========================================================
   ================= HISTORY ==============================
========================================================= */

func (g *GovernanceContract) GetHistory(
	ctx contractapi.TransactionContextInterface,
	id string,
)([]string,error){

	iter,_ := ctx.GetStub().GetHistoryForKey(id)
	defer iter.Close()

	var out []string
	for iter.HasNext(){
		r,_ := iter.Next()
		out = append(out,string(r.Value))
	}
	return out,nil
}

func (g *GovernanceContract) AddFundsRaised(
 ctx contractapi.TransactionContextInterface,
 id string,
 amount int,
) error {

 c, err := g.GetCampaign(ctx, id)
 if err != nil {
  return err
 }

 if c.Deleted {
  return fmt.Errorf("campaign deleted")
 }

 c.FundsRaised += amount

 js,_ := json.Marshal(c)
 return ctx.GetStub().PutState(id, js)
}


/* ========================================================= */

func main(){
	cc,err := contractapi.NewChaincode(&GovernanceContract{})
	if err != nil { panic(err) }
	cc.Start()
}
