pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/AccessControl.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../nfts/CityNft.sol";

contract CityFactory is AccessControl {
    using SafeMath for uint256;

    bytes32 public constant STATIC_ROLE = keccak256("STATIC");
    bytes32 public constant GENERATOR_ROLE = keccak256("GENERATOR");

    CityNft private nft;

    constructor(address _nft) public {
        require(_nft != address(0), "Invalid nft address");
        nft = CityNft(_nft);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    //--------------------------------------------------
    // Only Riverboat Minting contract
    //--------------------------------------------------

    function mint(
        uint256 _tokenId,
        uint8 _category,
        address _owner
    )
        public
        onlyStaticUser
        returns(bool)
    {
        return nft.mint(_tokenId, _category, _owner);
    }

    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------

    /// @dev Restricted to members of the admin role.
    modifier onlyAdmin() {
       require(isAdmin(msg.sender), "Restricted to admins.");
       _;
    }

    function setNft(address _nft) public onlyAdmin {
        require(_nft != address(0), "invalid owner address");
        nft = CityNft(_nft);
    }

    /// @dev Add an account to the admin role. Restricted to admins.
    function addAdmin(address account) public virtual onlyAdmin {
        grantRole(DEFAULT_ADMIN_ROLE, account);
    }

     /// @dev Return `true` if the account belongs to the admin role.
     function isAdmin(address account) public virtual view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
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
        require(account != address(0), "invalid account address");
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
        require(account != address(0), "invalid account address");
        grantRole(GENERATOR_ROLE, account);
     }

     /// @dev Remove an account from the user role. Restricted to admins.
     function removeGenerator(address account) public virtual onlyAdmin {
        revokeRole(GENERATOR_ROLE, account);
     }
}
