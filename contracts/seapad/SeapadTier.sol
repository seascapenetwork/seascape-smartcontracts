pragma solidity ^0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";

/**
 *  @title Seaped Tier
 *  @author Medet Ahmetson (@ahmetson)
 *  @notice This contract tracks the tier of every user, tier allocation by each project.
 */
contract SeapadTier is Ownable {
    using Counters for Counters.Counter;

    CrownsToken private immutable crowns;

    struct Badge {
        uint8 level;
        bool usable;
        uint256 nonce;
    }

    /// @notice Investor tier level
    /// @dev Investor address => TIER Level
    mapping(address => Badge) public badges;

    /// @notice Amount of Tokens that each tear could invest per project. In Stable USD coins
    /// @dev Project ID => [Tier 1 amount, Tier 2, Tier 3]
    mapping(uint256 => uint8[3]) public investAmount;

    /// @notice Amount of Crowns (CWS) that user would spend to claim the fee
    mapping(uint8 => uint256) public fees;

    /// @notice The Seapad contracts that can use the user Badge.
    /// @dev Smartcontract address => can use or not
    mapping(address => bool) public badgeUsers;

    /// @notice An account that tracks and prooves the Tier level to claim
    /// It tracks the requirements on the server side.
    /// @dev Used with v, r, s
    address public claimVerifier;

    event Fees(uint256 feeZero, uint256 feeOne, uint256 feeTwo, uint256 feeThree);
    event BadgeUser(address indexed user, bool allowed);
    event Claim(address indexed investor, uint8 indexed tier);
    event Use(address indexed investor, uint8 indexed tier);

    constructor(address _crowns, address _claimVerifier, uint256[4] memory _fees) public {
        require(_crowns != address(0), "Seaped: ZERO_ADDRESS");
        require(_claimVerifier != address(0), "Seapad: ZERO_ADDRESS");

        setFees(_fees);
        crowns = CrownsToken(_crowns);
        claimVerifier = _claimVerifier;
    }

    function setFees(uint256[4] memory _fees) public onlyOwner {
        require(_fees[0] > 0, "Seapad: ZERO_FEE_0");
        require(_fees[1] > 0, "Seapad: ZERO_FEE_1");
        require(_fees[2] > 0, "Seapad: ZERO_FEE_2");
        require(_fees[3] > 0, "Seapad: ZERO_FEE_3");

        fees[0] = _fees[0];
        fees[1] = _fees[1];
        fees[2] = _fees[2];
        fees[3] = _fees[3];

        emit Fees(_fees[0], _fees[1], _fees[2], _fees[3]);
    }

    function setClaimVerifier(address _claimVerifier) external onlyOwner {
        require(_claimVerifier != address(0), "Seapad: ZERO_ADDRESS");
        require(claimVerifier != _claimVerifier, "Seapad: SAME_ADDRESS");

        claimVerifier = _claimVerifier;
    }

    function setBadgeUser(address _user) external onlyOwner {
        require(_user != address(0), "Seapad: ZERO_ADDRESS");
        require(!badgeUsers[_user], "Seapad: ALREADY_ADDED");

        badgeUsers[_user] = true;

        BadgeUser(_user, true);
    }

    function unsetBadgeUser(address _user) external onlyOwner {
        require(_user != address(0), "Seapad: ZERO_ADDRESS");
        require(badgeUsers[_user], "Seapad: NO_USER");

        badgeUsers[_user] = false;

        BadgeUser(_user, false);
    }

    /// @notice Investor claims his Tier badge.
    /// This function intended to be called from the website directly
    function claim(uint8 level, uint8 v, bytes32 r, bytes32 s) external {
        require(level >= 0 && level < 4, "Seapad: INVALID_PARAMETER");
        Badge storage badge = badges[msg.sender];
        
        // if badge is used, then user can reclaim it.
        if (!badge.usable) {
            require(badge.level == level, "Seapad: LEVEL_MISMATCH");
        } else if (level != 0) {
            require(badge.level + 1 == level, "Seapad: INVALID_LEVEL");
        } else {
            require(false, "Seapad: CLAIM_0");
        }

        // investor, level verification
	    bytes memory prefix     = "\x19Ethereum Signed Message:\n32";
	    bytes32 message         = keccak256(abi.encodePacked(msg.sender, badge.nonce, level));
	    bytes32 hash            = keccak256(abi.encodePacked(prefix, message));
	    address recover         = ecrecover(hash, v, r, s);

	    require(recover == claimVerifier, "Seapad: SIG");

        // Charging fee
        require(crowns.spendFrom(msg.sender, fees[level]), "Seapad: CWS_UNSPEND");

        badge.level = level;
        badge.usable = true;
        badge.nonce = badge.nonce + 1;      // Prevent usage of signature the same time.

        emit Claim(msg.sender, level);
    }

    /// @notice Other Smartcontracts of Seapad use the Badge of user.
    /// It's happening, when user won the lottery.
    function use(address investor, uint8 level) external {
        require(level >= 0 && level < 4, "Seapad: INVALID_PARAMETER");
        require(investor != address(0), "Seapad: ZERO_ADDRESS");
        require(badgeUsers[msg.sender], "Seapad: FORBIDDEN");

        Badge storage badge = badges[investor];

        require(badge.level == level, "Seapad: INVALID_LEVEL");
        require(badge.usable, "Seapad: ALREADY_USED");

        badge.usable = false;

        /// @todo make it back to zero

        emit Use(investor, level);
    }

    function getTierLevel(address investor) external view returns(uint8) {
        return badges[investor].level;
    }
}