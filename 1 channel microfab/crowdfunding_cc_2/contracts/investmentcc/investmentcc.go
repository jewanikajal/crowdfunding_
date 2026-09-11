package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type InvestmentContract struct {
	contractapi.Contract
}

/* =========================================================
   ======================= MODELS ==========================
========================================================= */

type Wallet struct {
	ID      string `json:"id"`
	OwnerID string `json:"ownerId"`
	Type    string `json:"type"`   // STARTUP / INVESTOR / PLATFORM
	Balance int    `json:"balance"`
}

type Investment struct {
	ID           string `json:"id"`
	CampaignID   string `json:"campaignId"`
	InvestorID   string `json:"investorId"`
	Amount       int    `json:"amount"`
	Status       string `json:"status"` // INVESTED / RELEASED / REFUNDED / DISPUTED
	ApprovalHash string `json:"approvalHash"`
	MilestoneRef string `json:"milestoneRef"`
	CreatedAt    string `json:"createdAt"`
}

type CampaignFeeTier struct {
	ID          string `json:"id"`
	MinAmount   int    `json:"minAmount"`
	MaxAmount   int    `json:"maxAmount"`
	Percent     int    `json:"percent"`
	Description string `json:"description"`
}

type DisputeFeeTier struct {
	ID          string `json:"id"`
	MinAmount   int    `json:"minAmount"`
	MaxAmount   int    `json:"maxAmount"`
	FlatFee     int    `json:"flatFee"`
	Description string `json:"description"`
}

/* =========================================================
   ======================= HELPERS =========================
========================================================= */

func getMSP(ctx contractapi.TransactionContextInterface) (string, error) {
	return ctx.GetClientIdentity().GetMSPID()
}

func put(ctx contractapi.TransactionContextInterface, key string, v interface{}) error {
	js, _ := json.Marshal(v)
	return ctx.GetStub().PutState(key, js)
}

func getWallet(ctx contractapi.TransactionContextInterface, id string) (*Wallet, error) {
	b, err := ctx.GetStub().GetState(id)
	if err != nil || b == nil {
		return nil, fmt.Errorf("wallet not found")
	}
	var w Wallet
	json.Unmarshal(b, &w)
	return &w, nil
}

func (ic *InvestmentContract) walletKey(ownerID string) string {
	return "WALLET_" + ownerID
}

/* =========================================================
   ======================= WALLET ==========================
========================================================= */

func (ic *InvestmentContract) CreateWallet(
	ctx contractapi.TransactionContextInterface,
	walletID string,
	ownerID string,
	wtype string,
	balance int,
) error {

	msp, _ := getMSP(ctx)
	if msp != "PlatformOrgMSP" {
		return fmt.Errorf("only platform can create wallets")
	}

	if b, _ := ctx.GetStub().GetState(walletID); b != nil {
		return fmt.Errorf("wallet exists")
	}

	w := Wallet{
		ID:      walletID,
		OwnerID: ownerID,
		Type:    wtype,
		Balance: balance,
	}

	return put(ctx, walletID, w)
}

func (ic *InvestmentContract) ReadWallet(
	ctx contractapi.TransactionContextInterface,
	walletID string,
) (*Wallet, error) {
	return getWallet(ctx, walletID)
}

func (ic *InvestmentContract) TransferCFT(
	ctx contractapi.TransactionContextInterface,
	fromWallet string,
	toWallet string,
	amount int,
) error {

	from, err := getWallet(ctx, fromWallet)
	if err != nil {
		return err
	}

	to, err := getWallet(ctx, toWallet)
	if err != nil {
		return err
	}

	if from.Balance < amount {
		return fmt.Errorf("insufficient CFT")
	}

	from.Balance -= amount
	to.Balance += amount

	put(ctx, fromWallet, from)
	return put(ctx, toWallet, to)
}

/* =========================================================
   ======================= INVEST ==========================
========================================================= */

func (ic *InvestmentContract) InvestmentExists(
	ctx contractapi.TransactionContextInterface,
	id string,
) (bool, error) {
	b, err := ctx.GetStub().GetState(id)
	return b != nil, err
}

func (ic *InvestmentContract) InvestFunds(
	ctx contractapi.TransactionContextInterface,
	invID string,
	campaignID string,
	investorID string,
	amount int,
	approvalHash string,
) error {

	msp, _ := getMSP(ctx)
	if msp != "InvestorOrgMSP" {
		return fmt.Errorf("only investor org can invest")
	}

	if approvalHash == "" {
		return fmt.Errorf("validator approval required")
	}

	exists, _ := ic.InvestmentExists(ctx, invID)
	if exists {
		return fmt.Errorf("investment exists")
	}

	investorWallet := ic.walletKey(investorID)
	platformWallet := "WALLET_PLATFORM"

	// debit investor → credit platform escrow
	err := ic.TransferCFT(ctx, investorWallet, platformWallet, amount)
	if err != nil {
		return err
	}

	inv := Investment{
		ID:           invID,
		CampaignID:   campaignID,
		InvestorID:   investorID,
		Amount:       amount,
		Status:       "INVESTED",
		ApprovalHash: approvalHash,
		CreatedAt:    time.Now().Format(time.RFC3339),
	}

	return put(ctx, invID, inv)
}

func (ic *InvestmentContract) ReadInvestment(
	ctx contractapi.TransactionContextInterface,
	id string,
) (*Investment, error) {

	b, err := ctx.GetStub().GetState(id)
	if err != nil || b == nil {
		return nil, fmt.Errorf("investment not found")
	}

	var inv Investment
	json.Unmarshal(b, &inv)
	return &inv, nil
}

/* =========================================================
   =================== RELEASE / REFUND ====================
========================================================= */

func (ic *InvestmentContract) ReleaseFunds(
	ctx contractapi.TransactionContextInterface,
	invID string,
	startupID string,
	milestoneHash string,
) error {

	msp, _ := getMSP(ctx)
	if msp != "ValidatorOrgMSP" && msp != "PlatformOrgMSP" {
		return fmt.Errorf("validator/platform only")
	}

	inv, err := ic.ReadInvestment(ctx, invID)
	if err != nil {
		return err
	}

	if inv.Status != "INVESTED" {
		return fmt.Errorf("invalid state")
	}

	platformWallet := "WALLET_PLATFORM"
	startupWallet := ic.walletKey(startupID)

	err = ic.TransferCFT(ctx, platformWallet, startupWallet, inv.Amount)
	if err != nil {
		return err
	}

	inv.Status = "RELEASED"
	inv.MilestoneRef = milestoneHash

	return put(ctx, invID, inv)
}

func (ic *InvestmentContract) RefundInvestor(
	ctx contractapi.TransactionContextInterface,
	invID string,
) error {

	msp, _ := getMSP(ctx)
	if msp != "ValidatorOrgMSP" && msp != "PlatformOrgMSP" {
		return fmt.Errorf("validator/platform only")
	}

	inv, err := ic.ReadInvestment(ctx, invID)
	if err != nil {
		return err
	}

	if inv.Status == "RELEASED" {
		return fmt.Errorf("already released")
	}

	platformWallet := "WALLET_PLATFORM"
	investorWallet := ic.walletKey(inv.InvestorID)

	err = ic.TransferCFT(ctx, platformWallet, investorWallet, inv.Amount)
	if err != nil {
		return err
	}

	inv.Status = "REFUNDED"
	return put(ctx, invID, inv)
}

/* =========================================================
   ======================= DISPUTE =========================
========================================================= */

func (ic *InvestmentContract) RaiseDispute(
	ctx contractapi.TransactionContextInterface,
	invID string,
) error {

	msp, _ := getMSP(ctx)
	if msp != "InvestorOrgMSP" {
		return fmt.Errorf("investor only")
	}

	inv, err := ic.ReadInvestment(ctx, invID)
	if err != nil {
		return err
	}

	inv.Status = "DISPUTED"
	return put(ctx, invID, inv)
}

/* =========================================================
   ======================= FEE TIERS =======================
========================================================= */

func (ic *InvestmentContract) SetCampaignFeeTier(
	ctx contractapi.TransactionContextInterface,
	id string,
	min int,
	max int,
	percent int,
	desc string,
) error {

	msp, _ := getMSP(ctx)
	if msp != "PlatformOrgMSP" {
		return fmt.Errorf("platform only")
	}

	t := CampaignFeeTier{id, min, max, percent, desc}
	return put(ctx, "FEE_TIER_"+id, t)
}

func (ic *InvestmentContract) SetDisputeFeeTier(
	ctx contractapi.TransactionContextInterface,
	id string,
	min int,
	max int,
	flat int,
	desc string,
) error {

	msp, _ := getMSP(ctx)
	if msp != "PlatformOrgMSP" {
		return fmt.Errorf("platform only")
	}

	t := DisputeFeeTier{id, min, max, flat, desc}
	return put(ctx, "DISPUTE_TIER_"+id, t)
}

/* =========================================================
   ======================= FEES ============================
========================================================= */

func (ic *InvestmentContract) CollectCampaignFee(
	ctx contractapi.TransactionContextInterface,
	feeID string,
	startupID string,
	amount int,
) error {

	startupWallet := ic.walletKey(startupID)
	platformWallet := "WALLET_PLATFORM"

	err := ic.TransferCFT(ctx, startupWallet, platformWallet, amount)
	if err != nil {
		return err
	}

	rec := map[string]interface{}{
		"id": feeID,
		"startup": startupID,
		"amount": amount,
		"time": time.Now().String(),
	}

	return put(ctx, "FEE_REC_"+feeID, rec)
}

/* =========================================================
   ======================= HISTORY =========================
========================================================= */

func (ic *InvestmentContract) GetHistory(
	ctx contractapi.TransactionContextInterface,
	id string,
) ([]string, error) {

	iter, err := ctx.GetStub().GetHistoryForKey(id)
	if err != nil {
		return nil, err
	}
	defer iter.Close()

	var out []string
	for iter.HasNext() {
		r, _ := iter.Next()
		out = append(out, string(r.Value))
	}
	return out, nil
}

/* ========================================================= */

func main() {
	cc, err := contractapi.NewChaincode(&InvestmentContract{})
	if err != nil {
		panic(err)
	}
	cc.Start()
}
