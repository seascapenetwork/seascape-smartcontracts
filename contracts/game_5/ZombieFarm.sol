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

    //
    // Supported Rewards given to players after completing all levels or all challenges in the level
    //

    uint8 public supportedRewardsAmount;
    mapping(uint8 => address) supportedRewards;
    mapping(address => uint8) rewardAddresses;

    uint8 public supportedChallengesAmount;
    mapping(uint8 => address) supportedChallenges;
    mapping(address => uint8) challengeAddresses;

    // events
    //    AddSupportedReward
    event StartSession(uint8 indexed sessionId, uint256 startTime, uint256 period, 
        uint8 levelAmount, uint8 grandRewardId);

    constructor() public {}

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Session
    //
    //////////////////////////////////////////////////////////////////////////////////

    function startSession(uint256 startTime, uint256 period, uint8 grandRewardId, bytes calldata rewardData, uint8 levelAmount) external onlyOwner {
        // Check that Grand Reward is valid: the rewardData and reward id should be parsable.
        ZombieFarmRewardInterface reward = ZombieFarmRewardInterface(supportedRewards[grandRewardId]);
        require(reward.isValidData(rewardData), "Invalid reward data");

        require(levelAmount > 0 && levelAmount <= MAX_LEVEL, "level amount");
        require(!isActive(lastSessionId), "already active");

        require(startTime > now, "start time");
        require(period > 0, "period");

        lastSessionId = lastSessionId + 1;
        sessions[lastSessionId] = Session(startTime, period, levelAmount, grandRewardId);

        reward.saveReward(lastSessionId, 0, rewardData);

        emit StartSession(lastSessionId, startTime, period, levelAmount, grandRewardId);
    }

    function isActive(uint8 sessionId) internal view returns(bool) {
        if (sessionId == 0) {
            return false;
        }
        return (now >= sessions[sessionId].startTime && now <= sessions[sessionId].startTime + sessions[sessionId].period);
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
    function addChallenges(uint8 sessionId, uint8 levelId, uint8 challengesAmount, 
        uint8[] calldata challengeIds, byte[MAX_CHALLENGES][] calldata challengeData) external onlyOwner {
        // make sure that session is enabled. Not necessary that its active. For example session.startTime is greater than current time
        // make sure that level challenges were not added to the level
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Rewards
    //
    //////////////////////////////////////////////////////////////////////////////////

    function addSupportedReward(uint8 _id, address _address) external onlyOwner {
        // make sure that id in supportedRewards assigned to 0x0000000000000
        // make sure that rewardAddress[_address] is assigned to 0
        // make sure that _address is not 0x0000000
        // make sure that _id is greater than 0
        // emit AddSupportedReward event
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
