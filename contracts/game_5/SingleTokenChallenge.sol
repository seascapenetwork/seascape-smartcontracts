pragma solidity 0.6.7;

import "./ZombieFarmChallengeInterface.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Stake a one token, and earn another token
contract SingleTokenChallenge is ZombieFarmChallengeInterface {

    address stakeToken;
    address earnToken;
    address zombieFarm;
    /// @dev The account that keeps all ERC20 rewards
    address pool;

    struct Params {
        address stake;
        address earn;
    }

    struct SessionParams {
        uint8 levelId;
        uint256 totalReward;
        uint256 stakeAmount;        // Required amount to pass the level
        uint256 stakePeriod;        // Duration after which challenge considered to be completed.
        uint256 min;                // Min possible amount for staking. If 0, then no limit
        uint256 max;                // Max posible amount for staking. If 0, then no limit
    }

    mapping(uint32 => Params) public challenges;
    mapping(uint256 => mapping(uint32 => SessionParams)) public sessionChallenges;

    modifier onlyZombieFarm () {
	    require(msg.sender == zombieFarm, "onlyZombieFarm");
	    _;
    }

    event SaveReward(uint256 indexed sessionId, uint8 indexed rewardType, 
        address indexed token, uint256 generation, uint8 quality, uint256 imgId, uint256 amount);

    event RewardNft(uint256 indexed sessionId, uint8 rewardType, address indexed owner,
        uint256 indexed nftId, address token, uint256 generation, uint8 quality, uint256 imgId, uint256 amount);

    constructor (address _zombieFarm, address _pool) public {
        require(_zombieFarm != address(0), "_zombieFarm");
        require(_pool != address(0), "_pool");

        zombieFarm = _zombieFarm;
        pool = _pool;
    }

    function newChallenge(uint32 id, bytes calldata data) external override onlyZombieFarm {
        require(challenges[id].stake == address(0), "single token challenge exists");

        address _stake;
        address _earn;

        (_stake, _earn) = abi.decode(data, (address, address));
        require(_stake != address(0), "data.stake");
        require(_earn != address(0), "data.earn");

        challenges[id] = Params(_stake, _earn);
    }

    function saveChallenge(uint256 sessionId, uint8 offset, bytes calldata data) external override onlyZombieFarm {
        uint32[5] memory id;
        uint8[5] memory levelId;
        uint256[5] memory reward;
        uint256[5] memory stakeAmount;
        uint256[5] memory stakePeriod;
        uint256[5] memory min;       
        uint256[5] memory max;

        (id, levelId, reward, stakeAmount, stakePeriod, min, max) = 
            abi.decode(data, (uint32[5], uint8[5], uint256[5], uint256[5], uint256[5], uint256[5], uint256[5])); 

        Params storage challenge = challenges[id[offset]];

        // Challenge.stake is not null, means that Challenge.earn is not null too.
        require(challenge.stake != address(0), "single token.challenge is not existing");
        require(reward[offset] > 0, "single token.reward==0");
        require(levelId[offset] > 0, "single token.level==0");
        require(sessionId > 0, "single token.session id==0");
        require(stakeAmount[offset] > 0, "single token.stake amount==0");
        require(stakePeriod[offset] > 0, "single token.stake period==0");
        if (max[offset] != 0) {
            require(min[offset] <= max[offset], "single token.min > max");
            require(stakeAmount[offset] <= max[offset], "single token.stake > max");
        }
        require(sessionChallenges[sessionId][id[offset]].totalReward == 0, "challenge to level added before");

        sessionChallenges[sessionId][id[offset]] = SessionParams(levelId[offset], reward[offset],
            stakeAmount[offset], stakePeriod[offset], min[offset], max[offset]
        );
    }

    function stake(uint256 sessionId, uint8 levelId, bytes memory data) public onlyZombieFarm {
        //require(isValidData(data), "scape reward:isvaliddata");

        //uint256 id;
        //uint256 amount;

        //(id, amount) = abi.decode(data, (uint32, uint256)); 

        //sessionChallenges[sessionId][levelId][rewardType] = Params(imgId, generation, quality, token, amount);

        //emit SaveReward(sessionId, rewardType, token, generation, quality, imgId, amount);
    }

    function isValidData(uint8 offset, bytes memory data) public override view onlyZombieFarm returns (bool) {
        uint32[5] memory id;
        uint8[5] memory levelId;
        uint256[5] memory reward;
        uint256[5] memory stakeAmount;
        uint256[5] memory stakePeriod;
        uint256[5] memory min;       
        uint256[5] memory max;

        (id, levelId, reward, stakeAmount, stakePeriod, min, max) = 
            abi.decode(data, (uint32[5], uint8[5], uint256[5], uint256[5], uint256[5], uint256[5], uint256[5])); 

        Params storage challenge = challenges[id[offset]];

        if (challenge.stake == address(0)) {
            return false;
        }

        return true;
    }

    function getIdAndLevel(uint8 offset, bytes calldata data) external override view onlyZombieFarm returns(uint32, uint8) {
        uint32[5] memory id;
        uint8[5] memory levelId;
        uint256[5] memory reward;
        uint256[5] memory stakeAmount;
        uint256[5] memory stakePeriod;
        uint256[5] memory min;       
        uint256[5] memory max;

        (id, levelId, reward, stakeAmount, stakePeriod, min, max) = 
            abi.decode(data, (uint32[5], uint8[5], uint256[5], uint256[5], uint256[5], uint256[5], uint256[5])); 


        return (id[offset], levelId[offset]);
    }

    function reward(uint256 sessionId, uint8 rewardType, address owner) external override onlyZombieFarm {
        //Params storage params = sessionRewards[sessionId][rewardType];

        //NftFactory nftFactory = NftFactory(factory);
        //IERC20 token = IERC20(params.token);
        
        //uint256 id = nftFactory.mintQuality(owner, params.generation, params.quality);
        //require(token.transferFrom(pool, owner, params.amount), "erc20 reward");

        //emit RewardNft(sessionId, rewardType, owner, id, params.token, params.generation, params.quality, params.imgId, params.amount);
    }
}