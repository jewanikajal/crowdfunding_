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
	PlatformFeePercent     = 2      // 2% platform fee on successful funding
	ValidatorRewardPercent = 1      // 1% of platform fee goes to validator
	RefundRetainPercent    = 10     // 10% retained by platform on refund
	DisputeWindowDays      = 7      // 7 days dispute window after funding
	MinInvestorIncome      = 500000 // Minimum annual income in units to be eligible
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

// ============================================================
// CONTRACT
// ============================================================

type GovContract struct {
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
// Note: Investor registration also lives here so validator
//       can validate investors from gov channel
// ============================================================

// RegisterStartup — Startup submits KYC & business details
func (c *GovContract) RegisterStartup(ctx contractapi.TransactionContextInterface,
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

// RegisterInvestor — Investor submits KYC & financial details
// Registered on gov channel so validator can approve/reject
func (c *GovContract) RegisterInvestor(ctx contractapi.TransactionContextInterface,
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
func (c *GovContract) RegisterValidator(ctx contractapi.TransactionContextInterface,
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
func (c *GovContract) ValidateStartup(ctx contractapi.TransactionContextInterface,
	startupID, decision string) error {

	bytes, err := ctx.GetStub().GetState("STARTUP_" + startupID)
	if err != nil || bytes == nil {
		return fmt.Errorf("startup %s not found", startupID)
	}

	var startup Startup
	json.Unmarshal(bytes, &startup)

	if startup.ValidationStatus != StatusPending {
		return fmt.Errorf("startup already %s", startup.ValidationStatus)
	}

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
func (c *GovContract) ValidateInvestor(ctx contractapi.TransactionContextInterface,
	investorID, decision string) error {

	bytes, err := ctx.GetStub().GetState("INVESTOR_" + investorID)
	if err != nil || bytes == nil {
		return fmt.Errorf("investor %s not found", investorID)
	}

	var investor Investor
	json.Unmarshal(bytes, &investor)

	if investor.ValidationStatus != StatusPending {
		return fmt.Errorf("investor already %s", investor.ValidationStatus)
	}

	if investor.PanNumber == "" || investor.AadharNumber == "" {
		return fmt.Errorf("investor KYC incomplete — PAN and Aadhar required")
	}

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
func (c *GovContract) CreateProject(ctx contractapi.TransactionContextInterface,
	projectID, startupID, title, description string,
	goal int64, duration int,
	industry, projectType, country, targetMarket, currentStage string) error {

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

// ApproveProject — Validator approves project, generates approval hash
// This hash is passed to investment-channel to authorize funding
func (c *GovContract) ApproveProject(ctx contractapi.TransactionContextInterface,
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

// RejectProject — Validator rejects project
func (c *GovContract) RejectProject(ctx contractapi.TransactionContextInterface,
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

// ResolveDispute — Validator resolves dispute raised on investment channel
// Decision is recorded on gov channel as authoritative record
func (c *GovContract) ResolveDispute(ctx contractapi.TransactionContextInterface,
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

	return put(ctx, "DISPUTE_"+projectID+"_"+investorID, dispute)
}

// ============================================================
// QUERY FUNCTIONS
// ============================================================

// GetProject — returns project details
func (c *GovContract) GetProject(ctx contractapi.TransactionContextInterface,
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
func (c *GovContract) GetStartup(ctx contractapi.TransactionContextInterface,
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
func (c *GovContract) GetInvestor(ctx contractapi.TransactionContextInterface,
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
	contract := new(GovContract)
	cc, err := contractapi.NewChaincode(contract)
	if err != nil {
		panic(fmt.Sprintf("Error creating gov chaincode: %v", err))
	}
	if err := cc.Start(); err != nil {
		panic(fmt.Sprintf("Error starting gov chaincode: %v", err))
	}
}
