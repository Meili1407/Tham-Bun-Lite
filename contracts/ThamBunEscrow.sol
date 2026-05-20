// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ThamBunEscrow {
    enum CaseStatus {
        Funding,
        Funded,
        TreatmentVerified,
        Released
    }

    struct CaseData {
        address payable provider;
        uint256 targetAmount;
        uint256 raisedAmount;
        CaseStatus status;
    }

    address public immutable oracle;
    uint256 public nextCaseId = 1;
    mapping(uint256 => CaseData) public cases;

    event CaseCreated(uint256 indexed caseId, address indexed provider, uint256 targetAmount);
    event CaseFunded(uint256 indexed caseId, address indexed donor, uint256 amount);
    event TreatmentVerified(uint256 indexed caseId);
    event Released(uint256 indexed caseId, address indexed provider, uint256 amount);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }

    constructor(address oracleAddress) {
        require(oracleAddress != address(0), "Invalid oracle");
        oracle = oracleAddress;
    }

    function createCase(address payable provider, uint256 targetAmount) external onlyOracle returns (uint256 caseId) {
        require(provider != address(0), "Invalid provider");
        require(targetAmount > 0, "Invalid target");

        caseId = nextCaseId++;
        cases[caseId] = CaseData({
            provider: provider,
            targetAmount: targetAmount,
            raisedAmount: 0,
            status: CaseStatus.Funding
        });

        emit CaseCreated(caseId, provider, targetAmount);
    }

    function fundCase(uint256 caseId) external payable {
        CaseData storage caseData = cases[caseId];
        require(caseData.provider != address(0), "Case not found");
        require(caseData.status == CaseStatus.Funding || caseData.status == CaseStatus.Funded, "Not fundable");
        require(msg.value > 0, "No value");

        caseData.raisedAmount += msg.value;
        if (caseData.raisedAmount >= caseData.targetAmount) {
            caseData.status = CaseStatus.Funded;
        }

        emit CaseFunded(caseId, msg.sender, msg.value);
    }

    function markTreatmentVerified(uint256 caseId) external onlyOracle {
        CaseData storage caseData = cases[caseId];
        require(caseData.status == CaseStatus.Funded, "Case not funded");

        caseData.status = CaseStatus.TreatmentVerified;
        emit TreatmentVerified(caseId);
    }

    function releaseToProvider(uint256 caseId) external onlyOracle {
        CaseData storage caseData = cases[caseId];
        require(caseData.status == CaseStatus.TreatmentVerified, "Treatment not verified");

        uint256 amount = caseData.raisedAmount;
        caseData.raisedAmount = 0;
        caseData.status = CaseStatus.Released;
        caseData.provider.transfer(amount);

        emit Released(caseId, caseData.provider, amount);
    }
}
