pragma solidity 0.6.7;

//declare imports
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../seascape_nft/NftFactory.sol";
import "./../seascape_nft/SeascapeNft.sol";

import "./ZombieFarmRewardInterface.sol";
import "./ZombieFarmChallengeInterface.sol";


contract ZombieFarm is Ownable, IERC721Receiver{
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    NftFactory nftFactory;
    SeascapeNft private nft;

    uint8 public constant MAX_LEVEL = 5;                // Max levels in the game
    uint8 public constant MAX_CHALLENGES = 10;          // Max possible challenges

    //
    // Session global variables and structures
    //
    uint8 public lastSessionId;
    struct Session {
        uint256 startTime;
        uint256 period;
        uint8 levelAmount;
        uint8 rewardId;
    }
    mapping(uint256 => Session) public sessions;
    /// @dev There could be only one challenge category per level.
    /// mapping structure: session -> challenge id = true|false
    mapping(uint256 => mapping(uint32 => bool)) public sessionChallenges;

    //
    // Supported Rewards given to players after completing all levels or all challenges in the level
    //

    uint16 public supportedRewardsAmount;
    mapping(uint16 => address) public supportedRewards;
    mapping(address => uint16) public rewardAddresses;

    uint32 public supportedChallengesAmount;
    mapping(uint32 => address) public supportedChallenges;

    //
    // events
    //
    event StartSession(uint8 indexed sessionId, uint256 startTime, uint256 period, 
        uint8 levelAmount, uint8 grandRewardId);
    event AddSupportedReward(uint16 indexed rewardId, address indexed rewardAdress);
    event AddSupportedChallenge(uint32 indexed challengeId, address indexed challengeAddress);

    constructor() public {}

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Session
    //
    //////////////////////////////////////////////////////////////////////////////////

    function startSession(uint256 startTime, uint256 period, uint8 grandRewardId, bytes calldata rewardData, uint8 levelAmount) external onlyOwner {
        require(supportedRewards[grandRewardId] != address(0), "grandRewardId");

        // Check that Grand Reward is valid: the rewardData and reward id should be parsable.
        ZombieFarmRewardInterface reward = ZombieFarmRewardInterface(supportedRewards[grandRewardId]);
        require(reward.isValidData(rewardData), "Invalid reward data");

        require(levelAmount > 0 && levelAmount <= MAX_LEVEL, "level amount");
        require(!isActive(lastSessionId), "isActive");

        require(startTime > now, "start time");
        require(period > 0, "period");

        lastSessionId = lastSessionId + 1;

        Session storage session = sessions[lastSessionId];

        session.startTime = startTime;
        session.period = period;
        session.levelAmount = levelAmount;
        session.rewardId = grandRewardId;

        reward.saveReward(lastSessionId, 0, rewardData);

        emit StartSession(lastSessionId, startTime, period, levelAmount, grandRewardId);
    }

    function isActive(uint8 sessionId) internal view returns(bool) {
        if (sessionId == 0) {
            return false;
        }
        return (now >= sessions[sessionId].startTime && now <= sessions[sessionId].startTime + sessions[sessionId].period);
    }

    function isStarting(uint8 sessionId) internal view returns(bool) {
        if (sessionId == 0) {
            return false;
        }
        return (now <= sessions[sessionId].startTime + sessions[sessionId].period);
    }

    function lastSession() external view returns(uint8, uint256, uint256, uint8, uint8) {
        Session storage session = sessions[lastSessionId];

        return (lastSessionId, session.startTime, session.period, session.levelAmount, session.rewardId);
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Challenges
    //
    //////////////////////////////////////////////////////////////////////////////////
    
    /// @notice Add possible challenge options to the level
    /// @param sessionId the session for which its added
    /// @param challengesAmount amount that is added
    /// @param id. (It should be same to determine the category of all challenges).
    /// @param data of all challenge parameters
    function addChallenges(uint8 sessionId, uint8 challengesAmount, uint32 id, bytes calldata data) external onlyOwner {
        require(isStarting(sessionId), "sessionId");
        require(challengesAmount > 0 && challengesAmount <= 5, "challengesAmount");

        require(id > 0, "id==0");
        require(supportedChallenges[id] != address(0), "id!=address");

        uint32[5] memory actualId;
        uint8[5] memory levelId;

        for (uint8 i = 0; i < challengesAmount; i++) {
            ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(supportedChallenges[id]);
            (actualId[i], levelId[i]) = challenge.getIdAndLevel(i, data);

            require(sessionChallenges[sessionId][actualId[i]] == false, "levelChallenge");
            require(levelId[i] > 0, "levelId==0");
            require(levelId[i] <= sessions[sessionId].levelAmount, "levelId");
            require(supportedChallenges[actualId[i]] != address(0), "id!=address");
            require(countChallenges(actualId[i], actualId) > 1, "same challenges");
        }

        for (uint8 i = 0; i < challengesAmount; i++) {
            ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(supportedChallenges[actualId[i]]);
            challenge.saveChallenge(sessionId, i, data);

            sessionChallenges[sessionId][actualId[i]] = true;
        }
    }

    function countChallenges(uint32 challenge, uint32[5] memory ids) internal pure returns(uint8) {
        uint8 count;
        for (uint8 i = 0; i < 5; i++) {
            if (ids[i] == challenge) {
                count++;
            }
        }

        return count;
    }

    function addSupportedChallenge(address _address, bytes calldata _data) external onlyOwner {
        require(_address != address(0), "_address");

        ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(_address);

        supportedChallengesAmount = supportedChallengesAmount + 1;
        supportedChallenges[supportedChallengesAmount] = _address;

        challenge.newChallenge(supportedChallengesAmount + 1, _data);

        emit AddSupportedChallenge(supportedChallengesAmount, _address);
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Rewards
    //
    //////////////////////////////////////////////////////////////////////////////////

    /// @dev _address of the reward type.
    /// @notice WARNING! Please be careful when adding the reward type. It should be address of the deployed reward
    function addSupportedReward(address _address) external onlyOwner {
        require(_address != address(0), "_address");
        require(rewardAddresses[_address] == 0, "already added reward");

        supportedRewardsAmount = supportedRewardsAmount + 1;
        supportedRewards[supportedRewardsAmount] = _address;
        rewardAddresses[_address] = supportedRewardsAmount;

        emit AddSupportedReward(supportedRewardsAmount, _address);
    }


    ///////////////////////////////////////////////////////////////////////////////////

    /// @dev encrypt token data
    /// @return encrypted data
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    )
        external
        override
        returns (bytes4)
    {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

}
