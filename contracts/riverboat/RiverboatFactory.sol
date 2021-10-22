pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/AccessControl.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./RiverboatNft.sol";

contract RiverboatFactory is AccessControl {
    using SafeMath for uint256;

    bytes32 public constant STATIC_ROLE = keccak256("STATIC");
    bytes32 public constant GENERATOR_ROLE = keccak256("GENERATOR");

    RiverboatNft private nft;

    constructor(address _nft) public {
        nft = RiverboatNft(_nft);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    //--------------------------------------------------
    // Only Seascape Staking contract
    //--------------------------------------------------

    function mintType(address _owner, uint256 _type) public returns(uint256) {
        require (_type < 5, "invalid type");
        return nft.mint(_owner, _type);
    }

    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------

    function setNft(address _nft) public onlyAdmin {
        nft = RiverboatNft(_nft);
    }

    /// @dev Add an account to the admin role. Restricted to admins.
    function addAdmin(address account) public virtual onlyAdmin {
        grantRole(DEFAULT_ADMIN_ROLE, account);
    }

     /// @dev Remove oneself from the admin role.
     function renounceAdmin() public virtual {
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
     }

     /// @dev Return `true` if the account belongs to the admin role.
     function isAdmin(address account) public virtual view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
     }

     /// @dev Restricted to members of the admin role.
     modifier onlyAdmin() {
        require(isAdmin(msg.sender), "Restricted to admins.");
        _;
     }


     /// @dev Restricted to members of the user role.
     modifier onlyStaticUser() {
      	 require(isStaticUser(msg.sender), "Restricted to minters.");
      	 _;
     }

     /// @dev Return `true` if the account belongs to the user role.
     function isStaticUser(address account) public virtual view returns (bool) {
        return hasRole(STATIC_ROLE, account);
     }

     /// @dev Add an account to the user role. Restricted to admins.
     function addStaticUser(address account) public virtual onlyAdmin {
        grantRole(STATIC_ROLE, account);
     }

     /// @dev Remove an account from the user role. Restricted to admins.
     function removeStaticUser(address account) public virtual onlyAdmin {
        revokeRole(STATIC_ROLE, account);
     }


     /// @dev Restricted to members of the user role.
     modifier onlyGenerator() {
        require(isGenerator(msg.sender), "Restricted to random generator.");
        _;
     }

     /// @dev Return `true` if the account belongs to the user role.
     function isGenerator(address account) public virtual view returns (bool) {
        return hasRole(GENERATOR_ROLE, account);
     }

     /// @dev Add an account to the user role. Restricted to admins.
     function addGenerator(address account) public virtual onlyAdmin {
        grantRole(GENERATOR_ROLE, account);
     }

     /// @dev Remove an account from the user role. Restricted to admins.
     function removeGenerator(address account) public virtual onlyAdmin {
        revokeRole(GENERATOR_ROLE, account);
     }
}
