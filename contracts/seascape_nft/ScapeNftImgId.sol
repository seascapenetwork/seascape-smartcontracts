pragma solidity ^0.6.7;

import "./../openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Scape Nft images
 * @notice This Smartcontract holds the Image Ids of Scape Nfts.
 * The image ids are only one meta parameter of Scape Nfts that are used in other smartcontracts.
 * Image ids are also one of the few parameters that are permanent, so can be migrated to the blockchain.
 *
 * Since metadata is not stored outside of smart contracts, it's getting hard to fetch them into smart contract.
 * It requires the centralized server to return image id among with signature which makes 
 * the client development and dapp development longer.
 *
 * There are two ways of inserting Nft Image ids.
 *      1. Through nft minting function.
 *      2. Through fetching metadata using Chainlink oracles.
 *
 * Using Chainlink oracles requires a LINK token fee. This fee is taken from the user as the native token.
 * And swapped in decentralized exchanges using aggregator.
 * The aggregator is stored in Smartcontract.
 *
 * SCAPE NFT CATEGORIES
 * Since Nft images are stored here, we can also keep track the nft category. Each category has five Image ids.
 * So the smartcontracts that require scape nft images, can use image category too.
 *
 * The Chainlink oracle parameters are changeable (job, adapter, node)
 *
 * Note: The role names are inspired by mediaval Oghuz-Turkmen nomadic tradition. See Seljuk empire on wikipedia.
 */
contract ScapeNftImgId is AccessControl {

    /// @notice Has absolute power. It can grant roles and remove roles
    /// Only one Khan is possible to exist. If its data is removen, then contract became lost too.
    /// Khan can give his title to someone else.
    bytes32 public constant KHAN_ROLE = keccak256("OGHUZ_KHAN");
    /// @notice Has abosule power to grant or revoke other roles (Begs and Atabegs).
    /// But can not grant or revoke other Khatuns or the Khan.
    bytes32 public constant KHATUN_ROLE = keccak256("TURKAN");

    /// @notice Can edit the Chainlink parameters
    bytes32 public constant BEG_ROLE = keccak256("BAYRAM_KHAN");
    /// @notice A third party contracts that can insert nft image ids.
    bytes32 public constant ATABEG_ROLE = keccak256("GENERATOR");

    /// @notice The image of each Nft Scape.
    /// Mapping structure: nft id => image id 
    mapping(uint256 => uint256) public imgId;

    /// @dev The Image category associated image ids. Once its set, it can't be edited.
    /// Mapping structure: category => image id[5]
    mapping(bytes32 => uint256[5]) categoryImgs;

    constructor(address _nft) public {
	    //_setRoleAdmin(KHAN_ROLE, msg.sender);
    }

    /// modifiers
    /// @dev Restricted to members of the Khan role.
    //modifier onlyKhan() { require(hasRole(KHAN_ROLE, address(msg.sender)), "You are now the Khan."); _; }
}