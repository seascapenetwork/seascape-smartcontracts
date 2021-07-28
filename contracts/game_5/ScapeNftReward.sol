pragma solidity 0.6.7;

import "./../seascape_nft/NftFactory.sol";
import "./ZombieFarmRewardInterface.sol";

/// @dev possible reward types:
/// 0 - grand reward
/// non 0 - loot box for the level
contract ScapeNftReward is ZombieFarmRewardInterface {

    address factory;
    address scape;
    address zombieFarm;

    struct Params {
        uint256 imgId;
	    uint256 generation;	
	    uint8 quality;   
    }

    
    modifier onlyZombieFarm () {
	    require(msg.sender == zombieFarm, "onlyZombieFarm");
	    _;
    }

    mapping(uint256 => mapping(uint8 => Params)) public sessionRewards; 

    event SaveReward(uint256 indexed sessionId, uint8 indexed rewardType, uint256 generation, uint8 quality, uint256 imgId);

    event RewardNft(uint256 indexed sessionId, uint8 rewardType, address indexed owner,
        uint256 indexed nftId, uint256 generation, uint8 quality, uint256 imgId);

    constructor (address _factory, address _nft, address _zombieFarm) public {
        require(_factory != address(0), "_factory");
        require(_nft != address(0), "_nft");
        require(_zombieFarm != address(0), "_zombieFarm");

        factory = _factory;
        scape = _nft;
        zombieFarm = _zombieFarm;
    }

    function saveReward(uint256 sessionId, uint8 rewardType, bytes memory data) public override onlyZombieFarm {
        require(isValidData(data), "scape reward:isvaliddata");

        uint256 imgId;
        uint256 generation;
        uint8 quality;

        (imgId, generation, quality) = abi.decode(data, (uint256, uint256, uint8)); 

        sessionRewards[sessionId][rewardType] = Params(imgId, generation, quality);

        emit SaveReward(sessionId, rewardType, generation, quality, imgId);
    }

    function isValidData(bytes memory data) public override view onlyZombieFarm returns (bool) {
        uint256 imgId;
        uint256 generation;
        uint8 quality;

        (imgId, generation, quality) = abi.decode(data, (uint256, uint256, uint8)); 

        if (quality < 1 || quality > 5) {
            return false;
        }
        if (imgId > 0) {
            return false;
        }

        return true;
    }

    function reward(uint256 sessionId, uint8 rewardType, address owner) external override onlyZombieFarm {
        Params storage params = sessionRewards[sessionId][rewardType];

        NftFactory nftFactory = NftFactory(factory);
        uint256 id = nftFactory.mintQuality(owner, params.generation, params.quality);

        emit RewardNft(sessionId, rewardType, owner, id, params.generation, params.quality, params.imgId);
    }
}