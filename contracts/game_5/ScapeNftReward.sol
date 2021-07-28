pragma solidity 0.6.7;

import "./../seascape_nft/NftFactory.sol";
import "./ZombieFarmRewardInterface.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Reward a Scape Nft with certain ERC20 token
/// @dev possible reward types:
/// 0 - grand reward
/// non 0 - loot box for the level
contract ScapeNftReward is ZombieFarmRewardInterface {

    address factory;
    address zombieFarm;
    /// @dev The account that keeps all ERC20 tokens
    address pool;

    struct Params {
        uint256 imgId;
	    uint256 generation;	
	    uint8 quality;
        address token;
        uint256 amount;
    }
    
    modifier onlyZombieFarm () {
	    require(msg.sender == zombieFarm, "onlyZombieFarm");
	    _;
    }

    mapping(uint256 => mapping(uint8 => Params)) public sessionRewards; 

    event SaveReward(uint256 indexed sessionId, uint8 indexed rewardType, 
        address indexed token, uint256 generation, uint8 quality, uint256 imgId, uint256 amount);

    event RewardNft(uint256 indexed sessionId, uint8 rewardType, address indexed owner,
        uint256 indexed nftId, address token, uint256 generation, uint8 quality, uint256 imgId, uint256 amount);

    constructor (address _factory, address _zombieFarm, address _pool) public {
        require(_factory != address(0), "_factory");
        require(_zombieFarm != address(0), "_zombieFarm");
        require(_pool != address(0), "_pool");

        factory = _factory;
        zombieFarm = _zombieFarm;
        pool = _pool;
    }

    function saveReward(uint256 sessionId, uint8 rewardType, bytes memory data) public override onlyZombieFarm {
        require(isValidData(data), "scape reward:isvaliddata");

        uint256 imgId;
        uint256 generation;
        uint8 quality;
        address token;
        uint256 amount;

        (imgId, generation, quality, token, amount) = abi.decode(data, (uint256, uint256, uint8, address, uint256)); 

        sessionRewards[sessionId][rewardType] = Params(imgId, generation, quality, token, amount);

        emit SaveReward(sessionId, rewardType, token, generation, quality, imgId, amount);
    }

    function isValidData(bytes memory data) public override view onlyZombieFarm returns (bool) {
        uint256 imgId;
        uint256 generation;
        uint8 quality;
        address token;
        uint256 amount;

        (imgId, generation, quality, token, amount) = abi.decode(data, (uint256, uint256, uint8, address, uint256)); 

        if (quality < 1 || quality > 5) {
            return false;
        }
        if (imgId == 0 || amount == 0) {
            return false;
        }

        if (token == address(0)) {
            return false;
        }

        return true;
    }

    function reward(uint256 sessionId, uint8 rewardType, address owner) external override onlyZombieFarm {
        Params storage params = sessionRewards[sessionId][rewardType];

        NftFactory nftFactory = NftFactory(factory);
        IERC20 token = IERC20(params.token);
        
        uint256 id = nftFactory.mintQuality(owner, params.generation, params.quality);
        require(token.transferFrom(pool, owner, params.amount), "erc20 reward");

        emit RewardNft(sessionId, rewardType, owner, id, params.token, params.generation, params.quality, params.imgId, params.amount);
    }
}