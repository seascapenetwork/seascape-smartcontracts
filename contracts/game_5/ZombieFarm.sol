pragma solidity 0.6.7;

//declare imports
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";

import "./ZombieFarmRewardInterface.sol";
import "./ZombieFarmChallengeInterface.sol";


contract ZombieFarm is Ownable, IERC721Receiver{
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    uint8 public constant MAX_LEVEL = 5;                // Max levels in the game
    uint8 public constant MAX_CHALLENGES = 10;          // Max possible challenges

    /// For collecting fee for Speed up and Re-pick
    CrownsToken crowns;

    //
    // Session global variables and structures
    //
    uint8 public lastSessionId;

    struct Session {
        uint256 startTime;
        uint256 period;
        uint8 levelAmount;
        uint16 rewardId;
        uint256 speedUpFee;
        uint256 repickFee;
    }

    mapping(uint256 => Session) public sessions;
    /// @dev There could be only one challenge category per level.
    /// mapping structure: session -> challenge id = true|false
    mapping(uint256 => mapping(uint32 => bool)) public sessionChallenges;
    /// @notice There are level rewards for each season (loot boxes)
    /// mapping structure: session = levels[5]
    mapping(uint256 => uint16[5]) public sessionRewards;
    /// @dev The list of challenges that user used.
    /// mapping structure: session -> player -> level id = array[3]
    mapping(uint256 => mapping(address => mapping(uint8 => uint32[3]))) public playerLevels;
    /// @dev The list of rewards that user already claimed
    /// mapping structure: session -> player -> reward type = bool
    /// The reward types are, 0 = grand reward, non zero = level rewards
    mapping(uint256 => mapping(address => mapping(uint8 => bool))) public playerRewards;

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
    event StartSession(
        uint256 indexed sessionId,
        uint256 startTime,
        uint256 period,
        uint8 levelAmount,
        uint16 grandRewardId
    );

    event AddSupportedReward(
        uint16 indexed rewardId,
        address indexed rewardAdress
    );

    event AddSupportedChallenge(
        uint32 indexed challengeId,
        address indexed challengeAddress
    );

    event SpeedUp(
        uint256 indexed sessionId,
        uint32 indexed challengeId,
        address indexed staker,
        uint256 fee
    );

    event Repick(
        uint256 indexed sessionId,
        uint32 indexed challengeId,
        address indexed staker,
        uint256 fee
    );

    constructor(address _crowns) public {
        require(_crowns != address(0),"invalid _crowns address!");
        crowns = CrownsToken(_crowns);
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Session
    //
    //////////////////////////////////////////////////////////////////////////////////

    function startSession(
        uint256 startTime,
        uint256 period,
        uint16 grandRewardId,
        bytes calldata rewardData,
        uint8 levelAmount,
        uint256 speedUpFee,
        uint256 repickFee
    )
        external
        onlyOwner
    {
        require(supportedRewards[grandRewardId] != address(0), "unsupported grandRewardId");

        // Check that Grand Reward is valid: the rewardData and reward id should be parsable.
        ZombieFarmRewardInterface reward = ZombieFarmRewardInterface(
            supportedRewards[grandRewardId]);
        require(reward.isValidData(rewardData), "Invalid reward data");

        require(levelAmount > 0 && levelAmount <= MAX_LEVEL, "level amount should range 1-max");
        require(!isActive(lastSessionId), "last session still active");

        require(startTime > now, "session should start in future");
        require(period > 0, "period should be above 0");
        require(speedUpFee > 0, "speed up fee should be above 0");
        require(repickFee > 0, "repick fee should be above 0");

        lastSessionId = lastSessionId + 1;

        Session storage session = sessions[lastSessionId];

        session.startTime = startTime;
        session.period = period;
        session.levelAmount = levelAmount;
        session.rewardId = grandRewardId;
        session.speedUpFee = speedUpFee;
        session.repickFee = repickFee;

        reward.saveReward(lastSessionId, 0, rewardData);

        emit StartSession(lastSessionId, startTime, period, levelAmount, grandRewardId);
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
    function addChallenges(
        uint8 sessionId,
        uint8 challengesAmount,
        uint32 id,
        bytes calldata data
    )
        external
        onlyOwner
    {
        require(isStarting(sessionId), "session should be starting");
        require(challengesAmount > 0 && challengesAmount <= 5, "challengesAmount range is 1-5");

        require(id > 0, "id must be greater than 0");
        require(supportedChallenges[id] != address(0), "unsupported challenge at id");

        uint32[5] memory actualId;
        uint8[5] memory levelId;

        for (uint8 i = 0; i < challengesAmount; i++) {
            ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(
                supportedChallenges[id]);
            (actualId[i], levelId[i]) = challenge.getIdAndLevel(i, data);

            require(sessionChallenges[sessionId][actualId[i]] == false,
                "challenge!=session challenge");
            require(levelId[i] > 0, "levelId should be above 0");
            require(levelId[i] <= sessions[sessionId].levelAmount,
                "levelId must be <= levelAmount");
            require(supportedChallenges[actualId[i]] != address(0), "unsupported challenge");
            require(countChallenges(actualId[i], actualId) == 1, "same challenge arguments");
        }
        Session storage session = sessions[sessionId];

        for (uint8 i = 0; i < challengesAmount; i++) {
            ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(
                supportedChallenges[actualId[i]]);
            challenge.saveChallenge(sessionId, session.startTime, session.period, i, data);

            sessionChallenges[sessionId][actualId[i]] = true;
        }
    }

    function addSupportedChallenge(address _address, bytes calldata _data) external onlyOwner {
        require(_address != address(0), "invalid _address");

        ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(_address);

        supportedChallengesAmount = supportedChallengesAmount + 1;
        supportedChallenges[supportedChallengesAmount] = _address;

        challenge.newChallenge(supportedChallengesAmount, _data);

        emit AddSupportedChallenge(supportedChallengesAmount, _address);
    }

    function speedUp(uint256 sessionId, uint32 challengeId) external {
        require(sessionId > 0 && challengeId > 0, "sessionId or challengeId is 0");
        require(isActive(sessionId));
        require(supportedChallenges[challengeId] != address(0), "unsupported challenge id");

        address challengeAddress = supportedChallenges[challengeId];

        ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(challengeAddress);
        require(!challenge.isFullyCompleted(sessionId, challengeId, msg.sender),
            "challenge already completed");

        uint8 levelId = challenge.getLevel(sessionId, challengeId);
        require(levelId > 0, "no challenge");

        require(isChallengeInLevel(sessionId, levelId, challengeId, msg.sender),
            "haven't staked");

        uint256 fee = sessions[sessionId].speedUpFee;

        require(crowns.spendFrom(msg.sender, fee), "failed to spend fee");

        challenge.complete(sessionId, challengeId, msg.sender);

        emit SpeedUp(sessionId, challengeId, msg.sender, fee);
    }

    function repick(uint256 sessionId, uint32 challengeId) external {
        require(sessionId > 0 && challengeId > 0, "sessionId or challengeId is 0");
        require(isActive(sessionId));
        require(supportedChallenges[challengeId] != address(0), "unsupported challengeId");

        address challengeAddress = supportedChallenges[challengeId];

        ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(challengeAddress);
        uint8 levelId = challenge.getLevel(sessionId, challengeId);
        require(levelId > 0, "no challenge");

        require(!isChallengeInLevel(sessionId, levelId, challengeId, msg.sender),
            "haven't staked");

        uint256 fee = sessions[sessionId].repickFee;

        require(crowns.spendFrom(msg.sender, fee), "failed to spend fee");

        emit Repick(sessionId, challengeId, msg.sender, fee);
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Rewards
    //
    //////////////////////////////////////////////////////////////////////////////////

    /// @dev _address of the reward type.
    /// @notice WARNING! Please be careful when adding the reward type.
    /// It should be address of the deployed reward
    function addSupportedReward(address _address) external onlyOwner {
        require(_address != address(0), "invalid _address");
        require(rewardAddresses[_address] == 0, "reward already added");

        supportedRewardsAmount = supportedRewardsAmount + 1;
        supportedRewards[supportedRewardsAmount] = _address;
        rewardAddresses[_address] = supportedRewardsAmount;

        emit AddSupportedReward(supportedRewardsAmount, _address);
    }

    /// @notice Add possible rewards for each level
    /// @param sessionId the session for which its added
    /// @param rewardAmount how many rewards of the same category is added
    /// @param rewardId the id of the reward to determine the reward category
    /// @param data of all rewards
    function addCategoryRewards(
        uint8 sessionId,
        uint8 rewardAmount,
        uint16 rewardId,
        bytes calldata data
    )
        external
        onlyOwner
    {
        require(isStarting(sessionId), "session should be starting");
        require(rewardId > 0, "no reward added");
        require(rewardAmount > 0 && rewardAmount <= 5, "rewardAmount should range 1-5");
        require(supportedRewards[rewardId] != address(0), "unsupported rewardId");

        uint8[MAX_LEVEL] memory levelId;

        for (uint8 i = 0; i < rewardAmount; i++) {
            ZombieFarmRewardInterface reward = ZombieFarmRewardInterface(
                supportedRewards[rewardId]);
            levelId[i] = reward.getLevel(i, data);

            require(levelId[i] > 0, "levelId should be above 0");
            require(levelId[i] <= sessions[sessionId].levelAmount,
                "levelId should be < levelAmount");
            require(countLevels(levelId[i], levelId) == 1, "same levels arguments");
            require(sessionRewards[sessionId][levelId[i] - 1] == 0, "already set");
        }

        ZombieFarmRewardInterface reward = ZombieFarmRewardInterface(supportedRewards[rewardId]);
        reward.saveRewards(sessionId, rewardAmount, data);

        for (uint8 i = 0; i < rewardAmount; i++) {
            sessionRewards[sessionId][levelId[i] - 1] = rewardId;
        }
    }

    // Claim the reward for the lootbox
    // Lootboxes are given when all three challenges are completed in the level.
    function rewardLootBox(uint256 sessionId, uint8 levelId) external {
        require(sessionId > 0, "sessionId should be above 0");
        require(levelId > 0 && levelId <= MAX_LEVEL, "levelId should range 1-maxLevel");

        require(!playerRewards[sessionId][msg.sender][levelId], "already rewarded");
        require(isLevelCompleted(sessionId, levelId, msg.sender), "level not completed");

        uint16 rewardId = sessionRewards[sessionId][levelId - 1];
        require(rewardId > 0, "no reward added");

        ZombieFarmRewardInterface reward = ZombieFarmRewardInterface(supportedRewards[rewardId]);
        reward.reward(sessionId, levelId, msg.sender);

        playerRewards[sessionId][msg.sender][levelId] = true;
    }

    function rewardGrand(uint256 sessionId) external {
        require(sessionId > 0, "sessionId should be above 0");
        require(sessions[sessionId].startTime > 0, "session doesen't exist");
        require(!playerRewards[sessionId][msg.sender][0], "already rewarded");

        uint8 levelAmount = sessions[sessionId].levelAmount;

        for (uint8 levelId = 1; levelId <= levelAmount; levelId++) {
            require(isLevelCompleted(sessionId, levelId, msg.sender), "level not completed");
        }

        uint16 rewardId = sessions[sessionId].rewardId;

        ZombieFarmRewardInterface reward = ZombieFarmRewardInterface(supportedRewards[rewardId]);
        reward.reward(sessionId, 0, msg.sender);

        playerRewards[sessionId][msg.sender][0] = true;
    }

    function lastSession() external view returns(uint8, uint256, uint256, uint8, uint16) {
        Session storage session = sessions[lastSessionId];

        return (
            lastSessionId,
            session.startTime,
            session.period,
            session.levelAmount,
            session.rewardId
        );
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Stake/Unstake
    //
    //////////////////////////////////////////////////////////////////////////////////

    /// For example for single token challenge
    ///     user deposits some token amount.
    ///     the deposit checks whether it passes the min
    ///     the deposit checks whether it not passes the max
    ///     update the stake period
    function stake(uint256 sessionId, uint32 challengeId, bytes calldata data) external {
        require(sessionId > 0 && challengeId > 0, "sessionId or challengeId is 0");
        require(isActive(sessionId), "session not active");
        require(sessionChallenges[sessionId][challengeId], "challenge!=session challenge");

        ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(
            supportedChallenges[challengeId]);

        // Level Id always will be valid as it was checked when Challenge added to Session
        uint8 levelId = challenge.getLevel(sessionId, challengeId);

        require(!isLevelFull(sessionId, levelId, challengeId, msg.sender), "level already full");

        challenge.stake(sessionId, challengeId, msg.sender, data);

        fillLevel(sessionId, levelId, challengeId, msg.sender);
    }

    /// Withdraws sum of tokens.
    /// If withdraws before time period end, then withdrawing resets the time progress.
    /// If withdraws after time period end, then withdrawing claims reward
    /// and sets the time to be completed.
    function unstake(uint256 sessionId, uint32 challengeId, bytes calldata data) external {
        require(sessionId > 0 && challengeId > 0, "sessionId or challengeId is 0");
        require(sessions[sessionId].startTime > 0, "session doesen't exist");
        require(sessionChallenges[sessionId][challengeId], "challenge!=session challenge");

        ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(
            supportedChallenges[challengeId]);

        // Level Id always will be valid as it was checked when Challenge added to Session
        uint8 levelId = challenge.getLevel(sessionId, challengeId);

        require(isChallengeInLevel(sessionId, levelId, challengeId, msg.sender), "haven't staked");

        challenge.unstake(sessionId, challengeId, msg.sender, data);
    }

    // Claims earned tokens till today.
    // If claims before the time period, then it's just a claim.
    // If claims after the time period, then it withdraws staked tokens
    // and sets the time to be completed.
    function claim(uint256 sessionId, uint32 challengeId) external {
        require(sessionId > 0 && challengeId > 0, "sessionId or challengeId is 0");
        require(sessions[sessionId].startTime > 0, "session doesen't exist");
        require(sessionChallenges[sessionId][challengeId], "challenge!=session challenge");

        ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(
            supportedChallenges[challengeId]);

        // Level Id always will be valid as it was checked when Challenge added to Session
        uint8 levelId = challenge.getLevel(sessionId, challengeId);

        require(isChallengeInLevel(sessionId, levelId, challengeId, msg.sender), "haven't staked");

        challenge.claim(sessionId, challengeId, msg.sender);
    }

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

    function isLevelFull(uint256 sessionId, uint8 levelId, uint32 challengeId, address staker)
        public
        view
        returns(bool)
    {
        uint32[3] storage playerChallenges = playerLevels[sessionId][staker][levelId];

        bool full = true;

        for (uint8 i = 0; i < 3; i++) {
            // already used challenge can be used again.
            // even when level is full.
            if (playerChallenges[i] == challengeId) {
                return false;
            // one empty slot
            } else if (playerChallenges[i] == 0) {
                return false;
            } 

        }
        return true;
    }

    function fillLevel(uint256 sessionId, uint8 levelId, uint32 challengeId, address staker)
        internal
    {
        uint32[3] storage playerChallenges = playerLevels[sessionId][staker][levelId];

        uint8 empty = 0;

        for (uint8 i = 0; i < 3; i++) {
            if (playerChallenges[i] == challengeId) {
                return;
            } else if (playerChallenges[i] == 0) {
                empty = i;
                break;
            }
        }

        playerChallenges[empty] = challengeId;
    }

    function isLevelCompleted(uint256 sessionId, uint8 levelId, address staker)
        internal
        view
        returns(bool)
    {
        uint32[3] storage playerChallenges = playerLevels[sessionId][staker][levelId];

        for (uint8 i = 0; i < 3; i++) {
            if (playerChallenges[i] == 0) {
                return false;
            }

            uint32 challengeId = playerChallenges[i];
            address challengeAddress = supportedChallenges[challengeId];

            ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(challengeAddress);
            if (!challenge.isFullyCompleted(sessionId, challengeId, staker)) {
                return false;
            }
        }
        return true;
    }

    function isChallengeInLevel(
        uint256 sessionId,
        uint8 levelId,
        uint32 challengeId,
        address staker
    )
        internal
        view
        returns(bool)
    {
        uint32[3] storage playerChallenges = playerLevels[sessionId][staker][levelId];

        for (uint8 i = 0; i < 3; i++) {
            if (playerChallenges[i] == challengeId) {
                return true;
            }
        }

        return false;
    }

    function isActive(uint256 sessionId) internal view returns(bool) {
        if (sessionId == 0) {
            return false;
        }
        return (now >= sessions[sessionId].startTime && now <= sessions[sessionId]
            .startTime + sessions[sessionId].period);
    }

    function isStarting(uint8 sessionId) internal view returns(bool) {
        if (sessionId == 0) {
            return false;
        }
        return (now <= sessions[sessionId].startTime + sessions[sessionId].period);
    }

    function countLevels(uint8 levelId, uint8[5] memory ids) internal pure returns(uint8) {
        uint8 count;
        for (uint8 i = 0; i < MAX_LEVEL; i++) {
            if (ids[i] == levelId) {
                count++;
            }
        }
        return count;
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
}
