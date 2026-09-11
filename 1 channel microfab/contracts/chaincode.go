package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ============================================================
// CONSTANTS — Tokenomics & Business Rules
// ============================================================

const (
	PlatformFeePercent     = 2       // 2% platform fee on successful funding
	ValidatorRewardPercent = 1       // 1% of platform fee goes to validator
	RefundRetainPercent    = 10      // 10% retained by platform on refund
	DisputeWindowDays      = 7       // 7 days dispute window after funding
	MinInvestorIncome      = 500000  // Minimum annual income in units to be eligible
)

// ============================================================
// STATUS CONSTANTS
// ============================================================

const (
	StatusPending    = "PENDING"
	StatusApproved   = "APPROVED"
	StatusRejected   = "REJECTED"
	ProjectOpen      = "OPEN"
	ProjectFunded    = "FUNDED"
	ProjectClosed    = "CLOSED"
	ProjectCancelled = "CANCELLED"
	DisputeRaised    = "RAISED"
	DisputeResolved  = "RESOLVED"
)

// ============================================================
// STRUCTS
// ============================================================

type Startup struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Email             string `json:"email"`
	PanNumber         string `json:"panNumber"`
	GstNumber         string `json:"gstNumber"`
	IncorporationDate string `json:"incorporationDate"`
	Industry          string `json:"industry"`
	BusinessType      string `json:"businessType"`
	Country           string `json:"country"`
	State             string `json:"state"`
	City              string `json:"city"`
	Website           string `json:"website"`
	Description       string `json:"description"`
	FoundedYear       string `json:"foundedYear"`
	FounderName       string `json:"founderName"`
	ValidationStatus  string `json:"validationStatus"`
	DocType           string `json:"docType"`
}

type Investor struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Email            string `json:"email"`
	PanNumber        string `json:"panNumber"`
	AadharNumber     string `json:"aadharNumber"`
	InvestorType     string `json:"investorType"`
	Country          string `json:"country"`
	State            string `json:"state"`
	City             string `json:"city"`
	InvestmentFocus  string `json:"investmentFocus"`
	PortfolioSize    string `json:"portfolioSize"`
	AnnualIncome     int64  `json:"annualIncome"`
	OrganizationName string `json:"organizationName"`
	ValidationStatus string `json:"validationStatus"`
	DocType          string `json:"docType"`
}

type Validator struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Email             string `json:"email"`
	OrgName           string `json:"orgName"`
	LicenseNumber     string `json:"licenseNumber"`
	Country           string `json:"country"`
	State             string `json:"state"`
	Specialization    string `json:"specialization"`
	YearsOfExperience string `json:"yearsOfExperience"`
	DocType           string `json:"docType"`
}

type Project struct {
	ProjectID      string `json:"projectID"`
	StartupID      string `json:"startupID"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	Goal           int64  `json:"goal"`
	Duration       int    `json:"duration"`
	Industry       string `json:"industry"`
	ProjectType    string `json:"projectType"`
	Country        string `json:"country"`
	TargetMarket   string `json:"targetMarket"`
	CurrentStage   string `json:"currentStage"`
	Status         string `json:"status"`
	ApprovalStatus string `json:"approvalStatus"`
	ApprovalHash   string `json:"approvalHash"`
	TotalFunded    int64  `json:"totalFunded"`
	FundedAt       int64  `json:"fundedAt"`
	CreatedAt      int64  `json:"createdAt"`
	DocType        string `json:"docType"`
}

type Investment struct {
	InvestmentID string `json:"investmentID"`
	ProjectID    string `json:"projectID"`
	InvestorID   string `json:"investorID"`
	Amount       int64  `json:"amount"`
	PlatformFee  int64  `json:"platformFee"`
	NetAmount    int64  `json:"netAmount"`
	InvestedAt   int64  `json:"investedAt"`
	Refunded     bool   `json:"refunded"`
	DocType      string `json:"docType"`
}

type Dispute struct {
	DisputeID  string `json:"disputeID"`
	ProjectID  string `json:"projectID"`
	InvestorID string `json:"investorID"`
	Reason     string `json:"reason"`
	Status     string `json:"status"`
	Resolution string `json:"resolution"`
	RaisedAt   int64  `json:"raisedAt"`
	ResolvedAt int64  `json:"resolvedAt"`
	DocType    string `json:"docType"`
}

type FundRelease struct {
	ReleaseID       string `json:"releaseID"`
	ProjectID       string `json:"projectID"`
	StartupID       string `json:"startupID"`
	TotalReleased   int64  `json:"totalReleased"`
	ValidatorReward int64  `json:"validatorReward"`
	ReleasedAt      int64  `json:"releasedAt"`
	DocType         string `json:"docType"`
}

// ============================================================
// CONTRACT
// ============================================================

type CrowdfundContract struct {
	contractapi.Contract
}

// ============================================================
// HELPER — put state to ledger
// ============================================================

func put(ctx contractapi.TransactionContextInterface, key string, obj interface{}) error {
	bytes, err := json.Marshal(obj)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(key, bytes)
}

// ============================================================
// HELPER — generate approval hash
// ============================================================

func generateHash(data string) string {
	h := sha256.New()
	h.Write([]byte(data))
	return fmt.Sprintf("%x", h.Sum(nil))
}

// ============================================================
// REGISTRATION FUNCTIONS
// ============================================================

// RegisterStartup — Startup submits KYC & business details for validation
func (c *CrowdfundContract) RegisterStartup(ctx contractapi.TransactionContextInterface,
	id, name, email, panNumber, gstNumber, incorporationDate,
	industry, businessType, country, state, city,
	website, description, foundedYear, founderName string) error {

	existing, _ := ctx.GetStub().GetState("STARTUP_" + id)
	if existing != nil {
		return fmt.Errorf("startup %s already registered", id)
	}

	startup := Startup{
		ID:                id,
		Name:              name,
		Email:             email,
		PanNumber:         panNumber,
		GstNumber:         gstNumber,
		IncorporationDate: incorporationDate,
		Industry:          industry,
		BusinessType:      businessType,
		Country:           country,
		State:             state,
		City:              city,
		Website:           website,
		Description:       description,
		FoundedYear:       foundedYear,
		FounderName:       founderName,
		ValidationStatus:  StatusPending,
		DocType:           "STARTUP",
	}

	return put(ctx, "STARTUP_"+id, startup)
}

// RegisterInvestor — Investor submits KYC & financial details for validation
func (c *CrowdfundContract) RegisterInvestor(ctx contractapi.TransactionContextInterface,
	id, name, email, panNumber, aadharNumber,
	investorType, country, state, city,
	investmentFocus, portfolioSize string,
	annualIncome int64, organizationName string) error {

	existing, _ := ctx.GetStub().GetState("INVESTOR_" + id)
	if existing != nil {
		return fmt.Errorf("investor %s already registered", id)
	}

	investor := Investor{
		ID:               id,
		Name:             name,
		Email:            email,
		PanNumber:        panNumber,
		AadharNumber:     aadharNumber,
		InvestorType:     investorType,
		Country:          country,
		State:            state,
		City:             city,
		InvestmentFocus:  investmentFocus,
		PortfolioSize:    portfolioSize,
		AnnualIncome:     annualIncome,
		OrganizationName: organizationName,
		ValidationStatus: StatusPending,
		DocType:          "INVESTOR",
	}

	return put(ctx, "INVESTOR_"+id, investor)
}

// RegisterValidator — Validator registers with credentials
func (c *CrowdfundContract) RegisterValidator(ctx contractapi.TransactionContextInterface,
	id, name, email, orgName, licenseNumber,
	country, state, specialization, yearsOfExperience string) error {

	existing, _ := ctx.GetStub().GetState("VALIDATOR_" + id)
	if existing != nil {
		return fmt.Errorf("validator %s already registered", id)
	}

	validator := Validator{
		ID:                id,
		Name:              name,
		Email:             email,
		OrgName:           orgName,
		LicenseNumber:     licenseNumber,
		Country:           country,
		State:             state,
		Specialization:    specialization,
		YearsOfExperience: yearsOfExperience,
		DocType:           "VALIDATOR",
	}

	return put(ctx, "VALIDATOR_"+id, validator)
}

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

// ValidateStartup — Validator approves/rejects startup based on KYC data
func (c *CrowdfundContract) ValidateStartup(ctx contractapi.TransactionContextInterface,
	startupID, decision string) error {

	bytes, err := ctx.GetStub().GetState("STARTUP_" + startupID)
	if err != nil || bytes == nil {
		return fmt.Errorf("startup %s not found", startupID)
	}

	var startup Startup
	if err := json.Unmarshal(bytes, &startup); err != nil {
		return err
	}

	if startup.ValidationStatus != StatusPending {
		return fmt.Errorf("startup already %s", startup.ValidationStatus)
	}

	// Validate KYC fields present
	if startup.PanNumber == "" || startup.GstNumber == "" || startup.IncorporationDate == "" {
		return fmt.Errorf("startup KYC incomplete — PAN, GST, incorporation date required")
	}

	if decision == StatusApproved {
		startup.ValidationStatus = StatusApproved
	} else {
		startup.ValidationStatus = StatusRejected
	}

	return put(ctx, "STARTUP_"+startupID, startup)
}

// ValidateInvestor — Validator approves/rejects investor based on KYC + income eligibility
func (c *CrowdfundContract) ValidateInvestor(ctx contractapi.TransactionContextInterface,
	investorID, decision string) error {

	bytes, err := ctx.GetStub().GetState("INVESTOR_" + investorID)
	if err != nil || bytes == nil {
		return fmt.Errorf("investor %s not found", investorID)
	}

	var investor Investor
	if err := json.Unmarshal(bytes, &investor); err != nil {
		return err
	}

	if investor.ValidationStatus != StatusPending {
		return fmt.Errorf("investor already %s", investor.ValidationStatus)
	}

	// KYC check
	if investor.PanNumber == "" || investor.AadharNumber == "" {
		return fmt.Errorf("investor KYC incomplete — PAN and Aadhar required")
	}

	// Income eligibility check
	if investor.AnnualIncome < MinInvestorIncome {
		return fmt.Errorf("investor annual income %d below minimum threshold %d", investor.AnnualIncome, MinInvestorIncome)
	}

	if decision == StatusApproved {
		investor.ValidationStatus = StatusApproved
	} else {
		investor.ValidationStatus = StatusRejected
	}

	return put(ctx, "INVESTOR_"+investorID, investor)
}

// ============================================================
// PROJECT FUNCTIONS
// ============================================================

// CreateProject — Validated startup creates a new funding project
func (c *CrowdfundContract) CreateProject(ctx contractapi.TransactionContextInterface,
	projectID, startupID, title, description string,
	goal int64, duration int,
	industry, projectType, country, targetMarket, currentStage string) error {

	// Verify startup is validated
	sBytes, err := ctx.GetStub().GetState("STARTUP_" + startupID)
	if err != nil || sBytes == nil {
		return fmt.Errorf("startup %s not found", startupID)
	}
	var startup Startup
	json.Unmarshal(sBytes, &startup)
	if startup.ValidationStatus != StatusApproved {
		return fmt.Errorf("startup %s not approved — cannot create project", startupID)
	}

	existing, _ := ctx.GetStub().GetState("PROJECT_" + projectID)
	if existing != nil {
		return fmt.Errorf("project %s already exists", projectID)
	}

	project := Project{
		ProjectID:      projectID,
		StartupID:      startupID,
		Title:          title,
		Description:    description,
		Goal:           goal,
		Duration:       duration,
		Industry:       industry,
		ProjectType:    projectType,
		Country:        country,
		TargetMarket:   targetMarket,
		CurrentStage:   currentStage,
		Status:         ProjectOpen,
		ApprovalStatus: StatusPending,
		TotalFunded:    0,
		CreatedAt:      time.Now().Unix(),
		DocType:        "PROJECT",
	}

	return put(ctx, "PROJECT_"+projectID, project)
}

// ApproveProject — Validator approves a project, generates approval hash
func (c *CrowdfundContract) ApproveProject(ctx contractapi.TransactionContextInterface,
	projectID string) error {

	bytes, err := ctx.GetStub().GetState("PROJECT_" + projectID)
	if err != nil || bytes == nil {
		return fmt.Errorf("project %s not found", projectID)
	}

	var project Project
	json.Unmarshal(bytes, &project)

	if project.ApprovalStatus != StatusPending {
		return fmt.Errorf("project already %s", project.ApprovalStatus)
	}

	project.ApprovalStatus = StatusApproved
	project.ApprovalHash = generateHash(projectID + project.StartupID + strconv.FormatInt(time.Now().Unix(), 10))

	return put(ctx, "PROJECT_"+projectID, project)
}

// RejectProject — Validator rejects a project
func (c *CrowdfundContract) RejectProject(ctx contractapi.TransactionContextInterface,
	projectID string) error {

	bytes, err := ctx.GetStub().GetState("PROJECT_" + projectID)
	if err != nil || bytes == nil {
		return fmt.Errorf("project %s not found", projectID)
	}

	var project Project
	json.Unmarshal(bytes, &project)

	if project.ApprovalStatus != StatusPending {
		return fmt.Errorf("project already %s", project.ApprovalStatus)
	}

	project.ApprovalStatus = StatusRejected
	project.Status = ProjectCancelled

	return put(ctx, "PROJECT_"+projectID, project)
}

// ============================================================
// INVESTMENT FUNCTIONS
// ============================================================

// Fund — Validated investor funds an approved project
func (c *CrowdfundContract) Fund(ctx contractapi.TransactionContextInterface,
	projectID, investorID string, amount int64) error {

	// Verify investor is validated
	iBytes, err := ctx.GetStub().GetState("INVESTOR_" + investorID)
	if err != nil || iBytes == nil {
		return fmt.Errorf("investor %s not found", investorID)
	}
	var investor Investor
	json.Unmarshal(iBytes, &investor)
	if investor.ValidationStatus != StatusApproved {
		return fmt.Errorf("investor %s not approved", investorID)
	}

	// Verify project is approved and open
	pBytes, err := ctx.GetStub().GetState("PROJECT_" + projectID)
	if err != nil || pBytes == nil {
		return fmt.Errorf("project %s not found", projectID)
	}
	var project Project
	json.Unmarshal(pBytes, &project)

	if project.ApprovalStatus != StatusApproved {
		return fmt.Errorf("project %s not approved by validator", projectID)
	}
	if project.Status != ProjectOpen {
		return fmt.Errorf("project %s is not open for funding", projectID)
	}
	if amount <= 0 {
		return fmt.Errorf("invalid amount")
	}

	// Calculate fees
	platformFee := (amount * PlatformFeePercent) / 100
	netAmount := amount - platformFee

	// Record investment
	investmentID := projectID + "_" + investorID
	investment := Investment{
		InvestmentID: investmentID,
		ProjectID:    projectID,
		InvestorID:   investorID,
		Amount:       amount,
		PlatformFee:  platformFee,
		NetAmount:    netAmount,
		InvestedAt:   time.Now().Unix(),
		Refunded:     false,
		DocType:      "INVESTMENT",
	}

	if err := put(ctx, "INVESTMENT_"+investmentID, investment); err != nil {
		return err
	}

	// Update project total funded
	project.TotalFunded += netAmount
	if project.TotalFunded >= project.Goal {
		project.Status = ProjectFunded
		project.FundedAt = time.Now().Unix()
	}

	return put(ctx, "PROJECT_"+projectID, project)
}

// ReleaseFunds — Platform releases funds to startup after project is funded
func (c *CrowdfundContract) ReleaseFunds(ctx contractapi.TransactionContextInterface,
	projectID string) error {

	pBytes, err := ctx.GetStub().GetState("PROJECT_" + projectID)
	if err != nil || pBytes == nil {
		return fmt.Errorf("project %s not found", projectID)
	}

	var project Project
	json.Unmarshal(pBytes, &project)

	if project.Status != ProjectFunded {
		return fmt.Errorf("project %s not fully funded yet", projectID)
	}

	// Calculate validator reward (1% of platform fee pool)
	totalPlatformFee := (project.TotalFunded * PlatformFeePercent) / 100
	validatorReward := (totalPlatformFee * ValidatorRewardPercent) / 100

	release := FundRelease{
		ReleaseID:       "RELEASE_" + projectID,
		ProjectID:       projectID,
		StartupID:       project.StartupID,
		TotalReleased:   project.TotalFunded,
		ValidatorReward: validatorReward,
		ReleasedAt:      time.Now().Unix(),
		DocType:         "FUNDRELEASE",
	}

	if err := put(ctx, "RELEASE_"+projectID, release); err != nil {
		return err
	}

	project.Status = ProjectClosed
	return put(ctx, "PROJECT_"+projectID, project)
}

// Refund — Investor gets refund (90% back, 10% retained by platform)
func (c *CrowdfundContract) Refund(ctx contractapi.TransactionContextInterface,
	projectID, investorID string) error {

	investmentID := projectID + "_" + investorID
	iBytes, err := ctx.GetStub().GetState("INVESTMENT_" + investmentID)
	if err != nil || iBytes == nil {
		return fmt.Errorf("investment not found for investor %s on project %s", investorID, projectID)
	}

	var investment Investment
	json.Unmarshal(iBytes, &investment)

	if investment.Refunded {
		return fmt.Errorf("already refunded")
	}

	// Verify project is cancelled or dispute resolved in investor's favor
	pBytes, _ := ctx.GetStub().GetState("PROJECT_" + projectID)
	var project Project
	json.Unmarshal(pBytes, &project)

	if project.Status != ProjectCancelled {
		return fmt.Errorf("refund only allowed on cancelled projects")
	}

	// 10% retained, 90% refunded
	retained := (investment.Amount * RefundRetainPercent) / 100
	refundAmount := investment.Amount - retained

	investment.Refunded = true
	_ = refundAmount // in real system this triggers token transfer

	return put(ctx, "INVESTMENT_"+investmentID, investment)
}

// ============================================================
// DISPUTE FUNCTIONS
// ============================================================

// RaiseDispute — Investor raises dispute within 7 day window
func (c *CrowdfundContract) RaiseDispute(ctx contractapi.TransactionContextInterface,
	projectID, investorID, reason string) error {

	investmentID := projectID + "_" + investorID
	iBytes, err := ctx.GetStub().GetState("INVESTMENT_" + investmentID)
	if err != nil || iBytes == nil {
		return fmt.Errorf("investment not found")
	}

	var investment Investment
	json.Unmarshal(iBytes, &investment)

	// Check dispute window (7 days)
	now := time.Now().Unix()
	windowSeconds := int64(DisputeWindowDays * 24 * 60 * 60)
	if now-investment.InvestedAt > windowSeconds {
		return fmt.Errorf("dispute window of %d days has expired", DisputeWindowDays)
	}

	// Check duplicate dispute
	existing, _ := ctx.GetStub().GetState("DISPUTE_" + projectID + "_" + investorID)
	if existing != nil {
		return fmt.Errorf("dispute already raised")
	}

	dispute := Dispute{
		DisputeID:  projectID + "_" + investorID,
		ProjectID:  projectID,
		InvestorID: investorID,
		Reason:     reason,
		Status:     DisputeRaised,
		RaisedAt:   now,
		DocType:    "DISPUTE",
	}

	return put(ctx, "DISPUTE_"+projectID+"_"+investorID, dispute)
}

// ResolveDispute — Validator resolves dispute with a decision
func (c *CrowdfundContract) ResolveDispute(ctx contractapi.TransactionContextInterface,
	projectID, investorID, resolution string) error {

	dBytes, err := ctx.GetStub().GetState("DISPUTE_" + projectID + "_" + investorID)
	if err != nil || dBytes == nil {
		return fmt.Errorf("dispute not found")
	}

	var dispute Dispute
	json.Unmarshal(dBytes, &dispute)

	if dispute.Status == DisputeResolved {
		return fmt.Errorf("dispute already resolved")
	}

	dispute.Status = DisputeResolved
	dispute.Resolution = resolution
	dispute.ResolvedAt = time.Now().Unix()

	// If resolution favors investor — cancel project for refund
	if resolution == "REFUND" {
		pBytes, _ := ctx.GetStub().GetState("PROJECT_" + projectID)
		var project Project
		json.Unmarshal(pBytes, &project)
		project.Status = ProjectCancelled
		put(ctx, "PROJECT_"+projectID, project)
	}

	return put(ctx, "DISPUTE_"+projectID+"_"+investorID, dispute)
}

// ============================================================
// QUERY FUNCTIONS
// ============================================================

// GetProject — returns project details
func (c *CrowdfundContract) GetProject(ctx contractapi.TransactionContextInterface,
	projectID string) (*Project, error) {

	bytes, err := ctx.GetStub().GetState("PROJECT_" + projectID)
	if err != nil || bytes == nil {
		return nil, fmt.Errorf("project %s not found", projectID)
	}
	var project Project
	json.Unmarshal(bytes, &project)
	return &project, nil
}

// GetStartup — returns startup details
func (c *CrowdfundContract) GetStartup(ctx contractapi.TransactionContextInterface,
	startupID string) (*Startup, error) {

	bytes, err := ctx.GetStub().GetState("STARTUP_" + startupID)
	if err != nil || bytes == nil {
		return nil, fmt.Errorf("startup %s not found", startupID)
	}
	var startup Startup
	json.Unmarshal(bytes, &startup)
	return &startup, nil
}

// GetInvestor — returns investor details
func (c *CrowdfundContract) GetInvestor(ctx contractapi.TransactionContextInterface,
	investorID string) (*Investor, error) {

	bytes, err := ctx.GetStub().GetState("INVESTOR_" + investorID)
	if err != nil || bytes == nil {
		return nil, fmt.Errorf("investor %s not found", investorID)
	}
	var investor Investor
	json.Unmarshal(bytes, &investor)
	return &investor, nil
}

// ============================================================
// MAIN
// ============================================================

func main() {
	contract := new(CrowdfundContract)
	cc, err := contractapi.NewChaincode(contract)
	if err != nil {
		panic(fmt.Sprintf("Error creating chaincode: %v", err))
	}
	if err := cc.Start(); err != nil {
		panic(fmt.Sprintf("Error starting chaincode: %v", err))
	}
}
