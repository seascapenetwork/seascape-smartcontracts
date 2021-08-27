pragma solidity ^0.6.7;

import "./SeapadTier.sol";
import "./SeapadSubmission.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice The second phase of the Project Fund raising is to prefund. 
 */
contract SeapadPrefund is Ownable {

    struct Project {
        uint256 startTime;
        uint256 endTime;
        uint256[3] fixedPrices;         // Amount of tokens that user can invest, depending on his tier
        uint256[3] collectedAmounts;    // Amount of tokens that users invested so far.
        uint256[3] pools;               // Amount of tokens that could be invested in the pool.
        address token;                  // Token to accept
    }

    SeapadTier private seapadTier;
    SeapadSubmission private seapadSubmission;

    /// @notice The second phase information of the project
    mapping(uint256 => Project) public projects;

    /// @notice The investor prefunds in the project
    /// @dev Project -> Investor -> funded
    mapping(uint256 => mapping(address => bool)) public investments;

    /// @notice An account that tracks and prooves the Tier level to claim
    /// It tracks the requirements on the server side.
    /// @dev Used with v, r, s
    address public prefundVerifier;

    event AddProject(uint256 indexed projectId, address indexed token, uint256 startTime, uint256 endTime, uint256[3] pools, uint256[3] fixedPrices);
    event Prefund(uint256 indexed projectId, address indexed investor, uint8 tier, uint256 time);

    constructor(address _tier, address _submission, address _verifier) public {
        require(_tier != address(0) && _submission != address(0) && _verifier != address(0), "Seapad: ZERO_ADDRESS");
        require(_tier != _submission, "Seapad: SAME_ADDRESS");

        seapadTier = SeapadTier(_tier);
        seapadSubmission = SeapadSubmission(_submission);
        prefundVerifier = _verifier;
    }

    function setPrefundVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Seapad: ZERO_ADDRESS");
        require(prefundVerifier != _verifier, "Seapad: SAME_ADDRESS");

        prefundVerifier = _verifier;
    }

    /// @notice Add the second phase of the project
    /// @dev The start time is end time of first phase
    /// uint16 investorAmount 0 - total amount to spend for tier 1
    /// uint16 investorAmount 1 - total amount to spend for tier 2
    /// uint16 investorAmount 2 - total amount to spend for tier 3
    /// uint256 param 2 - tier 1 spend limit
    /// uint256 param 3 - tier 2 spend limit
    /// uint256 param 3 - tier 3 spend limit 
    function addProject(uint256 projectId, uint256 endTime, uint256[3] calldata fixedPrices, uint256[3] calldata pools, address _token) external onlyOwner {
        require(projectId > 0, "Seapad: INVALID_PARAMETER");
        require(endTime > 0 && now < endTime, "Seapad: INVALID_TIME");
        require(pools[0] > 0 && pools[1] > 0 && pools[2] > 0, "Seapad: ZERO_POOL_CAP");
        require(fixedPrices[0] > 0 && fixedPrices[1] > 0 && fixedPrices[2] > 0, "Seapad: ZERO_FIXED_PRICE");
        Project storage project = projects[projectId];
        require(project.startTime == 0, "Seapad: ALREADY_ADDED");

        uint256 submissionEndTime = seapadSubmission.getEndTime(projectId);
        require(submissionEndTime > 0 && submissionEndTime < endTime, "Seapad: INVALID_SUBMISSION_TIME");
    
        project.startTime = submissionEndTime;
        project.endTime = endTime;
        project.fixedPrices = fixedPrices;
        project.pools = pools;
        project.token = _token;

        emit AddProject(projectId, _token, submissionEndTime, endTime, pools, fixedPrices);
    }

    /// @dev v, r, s are used to ensure on server side that user passed KYC
    //todo pass Tier eligable for prefunding.
    //todo use the tier
    function prefund(uint256 projectId, uint8 v, bytes32 r, bytes32 s) external payable {
        require(projectId > 0, "Seapad: ZERO_ADDRESS");
        Project storage project = projects[projectId];
        require(project.startTime > 0, "Seapad: NO_PROJECT");
        require(investments[projectId][msg.sender] == false, "Seapad: ALREADY_PREFUNDED");

        require(project.startTime >= now, "Seapad: TOO_EARLY");
        require(project.endTime <= now, "Seapad: TOO_LATE");
        require(seapadSubmission.submissions(projectId, msg.sender), "Seapad: NOT_SUBMITTED");

        uint8 level = seapadTier.getTierLevel(msg.sender);
        require(level > 0 && level < 4, "Seapad: NO_TIER");

        require(project.collectedAmounts[level - 1] < project.pools[level - 1], "Seapad: TIER_CAP");

        // investor, project verification
	    bytes memory prefix     = "\x19Ethereum Signed Message:\n32";
	    bytes32 message         = keccak256(abi.encodePacked(msg.sender, projectId, level));
	    bytes32 hash            = keccak256(abi.encodePacked(prefix, message));
	    address recover         = ecrecover(hash, v, r, s);

	    require(recover == prefundVerifier, "Seapad: SIG");

        if (project.token == address(0)) {
            require(msg.value == project.fixedPrices[level - 1], "Seapad: NOT_ENOUGH_NATIVE");
        } else {
            IERC20 token = IERC20(project.token);
            require(token.transferFrom(msg.sender, address(this), project.fixedPrices[level - 1]), "Seapad: FAILED_TO_TRANSER");
        }

        project.collectedAmounts[level - 1] = project.collectedAmounts[level - 1] + project.fixedPrices[level - 1];
        investments[projectId][msg.sender] = true;

        emit Prefund(projectId, msg.sender, level, now);
    }

    function getEndTime(uint256 id) external view returns(uint256) {
        if (id == 0 || id <= seapadSubmission.totalProjects()) {
            return 0;
        }

        return projects[id].endTime;
    }

    /// @notice returns total pool, and invested pool
    /// @dev the first returning parameter is total pool. The second returning parameter is invested amount so far.
    function getTotalPool(uint256 id) external view returns(uint256, uint256) {
        Project storage project = projects[id];

        uint256 totalPool = project.pools[0] + project.pools[1] + project.pools[2];
        uint256 totalInvested = project.collectedAmounts[0] + project.collectedAmounts[1] + project.collectedAmounts[2];

        return (totalPool, totalInvested);
    }
}