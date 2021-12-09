pragma solidity 0.6.7;

//declare imports
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";

import "./interfaces/ZombieFarmRewardInterface.sol";
import "./interfaces/ZombieFarmChallengeInterface.sol";

/**
 * @notice The Main Smartcontract of the Zombie Farm, the fifth game of the Seascape Network.
 * RULE! One challenge and one reward token per session.
 */
contract ZombieFarm is Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    uint8 public constant MAX_LEVEL = 5;                // Max levels in the game

    /// For collecting fee for Speed up and Re-pick
    CrownsToken crowns;

    //
    // Session global variables and structures
    //
    uint8 public lastSessionId;
    address public verifier;

    struct Session {
        uint256 startTime;
        uint256 period;
        uint8 levelAmount;
        address reward;
        uint256 speedUpFee;
        uint256 repickFee;
    }

    mapping(uint256 => Session) public sessions;
    
    /// @dev There could be only one challenge category per level.
    /// mapping structure: session -> challenge address = true|false
    mapping(uint256 => mapping(address => bool)) public sessionChallenges;

    /// @notice There are level rewards for each season (loot boxes)
    /// mapping structure: session = levels[5]
    mapping(uint256 => mapping(uint8 => address)) public sessionRewards;
    /// @dev The list of challenges that user used.
    /// mapping structure: session -> level id -> player = challenge[3]
    mapping(uint256 => mapping(uint8 => mapping(address => address[3]))) public playerChallenges;

    /// @dev The list of rewards that user already claimed
    /// mapping structure: session -> player -> reward type = bool
    /// The reward types are, 0 = grand reward, non zero = level rewards
    mapping(uint256 => mapping(address => mapping(uint8 => bool))) public playerRewards;

    //
    // Supported Rewards given to players after completing all levels or all challenges in the level
    //
    uint16 public supportedRewardsAmount;
    mapping(address => bool) public supportedRewards;

    //
    // Challenges
    //
    uint32 public supportedChallengesAmount;
    mapping(address => bool) public supportedChallenges;

    //
    // events
    //
    event SetVerifier(
        address indexed verifier
    );

    event StartSession(
        uint256 indexed sessionId,
        uint256 startTime,
        uint256 period,
        uint8   levelAmount,
        address reward
    );

    event AddSupportedReward(
        uint16 indexed rewardId,
        address indexed rewardAdress
    );

    event AddRewardToSession(
        uint256 indexed sessionId,
        uint8 indexed rewardType,
        address indexed reward
    );

    event AddSupportedChallenge(
        uint32 indexed challengeId,
        address indexed challengeAddress
    );

    event AddChallengeToSession(
        uint256 indexed sessionId, 
        uint8 indexed levelId, 
        address indexed challenge
    );

    event PlayerChallenge(uint256 sessionId, uint8 levelId, uint8 slotId, address challenge, address staker);

    event SpeedUp(
        uint256 indexed sessionId,
        uint8 levelId,
        uint8 slotId,
        address indexed challenge,
        address indexed staker,
        uint256 fee
    );

    event Repick(
        uint256 indexed sessionId,
        uint8 levelId,
        uint8 slotId,
        address indexed challenge,
        address indexed staker,
        uint256 fee
    );

    constructor(address _crowns, address _verifier) public {
        require(_crowns != address(0),"invalid _crowns address!");
        crowns = CrownsToken(_crowns);
        verifier = _verifier;
    }

    function setVerifier(address _verifier) external onlyOwner {
        verifier = _verifier;
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Session
    //
    //////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Start a new Season.
     * @dev Need to call addChallenges after this one. So, make the startTime atleast five minutes ahead.
     * @param grandReward is the address of the Smartcontract that is used for keeping the assets for users.
     * This grand reward is given to the user upon completing all the network.
     */
    function startSession(
        uint256         startTime,
        uint256         period,
        uint8           levelAmount,
        uint256         speedUpFee,
        uint256         repickFee,
        address         grandReward
    )
        external
        onlyOwner
    {
        //
        // Verifying the Grand reward
        //
        require(supportedRewards[grandReward], "unsupported reward");
        ZombieFarmRewardInterface reward = ZombieFarmRewardInterface(grandReward);

        // Check that Grand Reward is valid: the rewardData and reward id should be parsable.
        // require(reward.isValidData(rewardData), "Invalid reward data");

        //
        // Verifying the Levels
        //
        require(levelAmount > 0 && levelAmount <= MAX_LEVEL, "level amount should range 1-max");
        require(!isActive(lastSessionId), "last session still active");

        //
        // Verifying the Session data
        // 
        require(startTime > now, "session should start in future");
        require(period > 0, "period should be above 0");
        require(speedUpFee > 0, "speed up fee should be above 0");
        require(repickFee > 0, "repick fee should be above 0");

        //
        // All verifications are completed.
        //
        lastSessionId           = lastSessionId + 1;

        Session storage session = sessions[lastSessionId];
        session.startTime       = startTime;
        session.period          = period;
        session.levelAmount     = levelAmount;
        session.reward          = grandReward;
        session.speedUpFee      = speedUpFee;
        session.repickFee       = repickFee;

        // reward.addGrandToSession(lastSessionId, rewardData);

        emit StartSession(lastSessionId, startTime, period, levelAmount, grandReward);
    }

    function lastSession() external view returns(uint8, uint256, uint256, uint8, address) {
        Session storage session = sessions[lastSessionId];

        return (
            lastSessionId,
            session.startTime,
            session.period,
            session.levelAmount,
            session.reward
        );
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Challenges
    //
    //////////////////////////////////////////////////////////////////////////////////

    /// @notice Add possible challenge options to the level
    /// @param sessionId the session for which its added
    /// @param levelId on which level this challenge will be stored?
    /// @param data of all challenge parameters
    function addChallengeToSession(
        uint8 sessionId,
        uint8 levelId,
        address challenge,
        bytes calldata data
    )
        external
        onlyOwner
    {
        require(isStarting(sessionId), "session should be starting");

        require(levelId > 0 && levelId <= sessions[sessionId].levelAmount, "invalid level id");
        require(supportedChallenges[challenge], "unsupported challenge at id");

        ZombieFarmChallengeInterface zombieChallenge = ZombieFarmChallengeInterface(challenge);
        zombieChallenge.addChallengeToSession(sessionId, levelId, data);

        sessionChallenges[sessionId][challenge] = true;

        emit AddChallengeToSession(sessionId, levelId, challenge);
    }

    /// @notice Let's know the ZombieFarm contract about newly deployed Challenge Smartcontract.
    /// @dev we partially trust the owner, so we are not checking is the contract a challenge contract or not.
    function supportChallenge(address _address) external onlyOwner {
        require(_address != address(0), "invalid _address");

        supportedChallengesAmount = supportedChallengesAmount + 1;
        supportedChallenges[_address] = true;

        emit AddSupportedChallenge(supportedChallengesAmount, _address);
    }

    function speedUp(uint256 sessionId, uint8 slotId, address challenge) external {
        require(slotId >= 0 && slotId < 3, "invalid slot id");
        require(isActive(sessionId));
        require(sessionChallenges[sessionId][challenge], "unsupported challenge");

        ZombieFarmChallengeInterface zombieChallenge = ZombieFarmChallengeInterface(challenge);
        require(!zombieChallenge.isFullyCompleted(sessionId, msg.sender), "challenge already completed");

        uint8 levelId = zombieChallenge.getLevel(sessionId);
        require(levelId > 0, "no link between session and challenge");

        require(playerChallenges[sessionId][levelId][msg.sender][slotId] == challenge, "invalid challenge address");

        uint256 fee = sessions[sessionId].speedUpFee;

        require(crowns.spendFrom(msg.sender, fee), "failed to spend fee");

        zombieChallenge.speedUp(sessionId, msg.sender);

        emit SpeedUp(sessionId, levelId, slotId, challenge, msg.sender, fee);
    }

    function repick(uint256 sessionId, uint8 slotId, address challenge) external {
        require(slotId >= 0 && slotId < 3, "invalid slot id");
        require(sessionId > 0, "sessionId or challengeId is 0");
        require(isActive(sessionId));
        require(sessionChallenges[sessionId][challenge], "!session.challenge");

        ZombieFarmChallengeInterface zombieChallenge = ZombieFarmChallengeInterface(challenge);
        uint8 levelId = zombieChallenge.getLevel(sessionId);
        require(levelId > 0, "no challenge");

        require(playerChallenges[sessionId][levelId][msg.sender][slotId] == address(0), "already staked");

        uint256 fee = sessions[sessionId].repickFee;

        require(crowns.spendFrom(msg.sender, fee), "failed to spend fee");

        emit Repick(sessionId, levelId, slotId, challenge, msg.sender, fee);
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Rewards
    //
    //////////////////////////////////////////////////////////////////////////////////

    /// @notice Lets know the ZombieFarm that there is a reward. 
    /// WARNING! Please be careful when adding the reward contract.
    /// It should be address of the deployed reward contract.
    /// When starting a new session, to enable the grand reward or loot boxes,
    /// You pass to the reward contract the parameters of session reward.
    /// @dev _address of the reward contract.
    function supportReward(address _address) external onlyOwner {
        require(_address != address(0), "invalid _address");
        require(!supportedRewards[_address], "reward already added");

        supportedRewardsAmount      = supportedRewardsAmount + 1;
        supportedRewards[_address]  = true;

        emit AddSupportedReward(supportedRewardsAmount, _address);
    }

    /// @notice Add the lootbox parameters for the level
    /// @dev IMPORTANT, it doesn't validate the input parameters. so call thin method with caution.
    /// @param sessionId the session for which its added
    /// @param levelId could be between 1 and MAX_LEVEL
    /// @param reward the contract address of the reward to determine the reward category
    /// @param data of all rewards
    function addLevelRewardToSession(
        uint8 sessionId,
        uint8 levelId,
        address reward,
        bytes calldata data
    )
        external
        onlyOwner
    {
        require(sessionRewards[sessionId][levelId] == address(0), "category reward set already");
        require(isStarting(sessionId), "session should be starting");
        uint8 rewardAmount = sessions[sessionId].levelAmount;
        require(rewardAmount > 0, "no session");
        require(levelId > 0 && levelId <= rewardAmount, "invalid level id");

        require(supportedRewards[reward], "unsupported reward or empty reward address");

        ZombieFarmRewardInterface zombieReward = ZombieFarmRewardInterface(reward);
        zombieReward.AddLevelToSession(sessionId, levelId, data);

        sessionRewards[sessionId][levelId] = reward;

        emit AddRewardToSession(sessionId, levelId, reward);
    }

    // Claim the reward for the lootbox
    // Lootboxes are given when all three challenges are completed in the level.
    function rewardLootBox(uint256 sessionId, uint8 levelId) external {
        require(sessionId > 0, "sessionId should be above 0");
        require(levelId > 0 && levelId <= sessions[sessionId].levelAmount, "exceeds level or no session");

        require(!playerRewards[sessionId][msg.sender][levelId], "already rewarded");
        require(isLevelCompleted(sessionId, levelId, msg.sender), "level not completed");

        address reward = sessionRewards[sessionId][levelId];
        require(reward != address(0), "no reward added");

        playerRewards[sessionId][msg.sender][levelId] = true;

        ZombieFarmRewardInterface zombieReward = ZombieFarmRewardInterface(reward);
        zombieReward.reward(sessionId, levelId, msg.sender);
    }

    function rewardGrand(uint256 sessionId) external {
        require(sessionId > 0, "sessionId should be above 0");
        require(sessions[sessionId].startTime > 0, "session doesen't exist");
        require(!playerRewards[sessionId][msg.sender][0], "already rewarded");

        uint8 levelAmount = sessions[sessionId].levelAmount;

        for (uint8 levelId = 1; levelId <= levelAmount; levelId++) {
            require(isLevelCompleted(sessionId, levelId, msg.sender), "level not completed");
        }

        ZombieFarmRewardInterface reward = ZombieFarmRewardInterface(sessions[sessionId].reward);
        reward.reward(sessionId, 0, msg.sender);

        playerRewards[sessionId][msg.sender][0] = true;
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
    function stake(uint256 sessionId, uint8 slotId, address challenge, 
        uint8 v, bytes32 r, bytes32 s, bytes calldata data
    ) external {
        require(slotId >= 0 && slotId <3, "invalid slot id");
        require(isActive(sessionId), "session not active");
        require(sessionChallenges[sessionId][challenge], "!session challenge");

        ZombieFarmChallengeInterface zombieChallenge = ZombieFarmChallengeInterface(challenge);
        uint8 levelId = zombieChallenge.getLevel(sessionId);

        // make sure that the slot id is approved by the server.
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(sessionId, levelId, slotId, challenge, msg.sender));
        bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
        address _recover = ecrecover(_message, v, r, s);
        require(_recover == verifier,  "Verification failed");

        // Check that this challenge is in the slot.
        // or wasn't on another slots on any level.
        // address slotChallenge = playerChallenges[sessionId][levelId][msg.sender][slotId];
        // require(slotChallenge == challenge || slotChallenge == address(0), "invalid challenge address");
        
        // previous challenge should be completed
        // if (levelId > 1) {
        //     address prevChallenge = playerChallenges[sessionId][levelId][msg.sender][slotId];
        //     zombieChallenge = ZombieFarmChallengeInterface(prevChallenge);

        //     require(zombieChallenge.isFullyCompleted(sessionId, msg.sender), "previous not completed");
        //     zombieChallenge = ZombieFarmChallengeInterface(challenge);
        // }

        zombieChallenge.stake(sessionId, msg.sender, data);

        playerChallenges[sessionId][levelId][msg.sender][slotId] = challenge;

        emit PlayerChallenge(sessionId, levelId, slotId, challenge, msg.sender);
    }

    /// Withdraws crypto assets, by whole or partially.
    /// If withdraws before time period end, then withdrawing resets the time progress.
    /// If withdraws after time period end, then withdrawing claims reward
    /// and sets the time to be completed.
    function unstake(uint256 sessionId, uint8 slotId, address challenge, bytes calldata data) external {
        require(sessionId >0, "sessionId or challengeId is 0");
        require(sessions[sessionId].startTime > 0, "session doesen't exist");
        require(sessionChallenges[sessionId][challenge], "!session challenge");

        ZombieFarmChallengeInterface zombieChallenge = ZombieFarmChallengeInterface(challenge);

        // Level Id always will be valid as it was checked when Challenge added to Session
        uint8 levelId = zombieChallenge.getLevel(sessionId);
        require(levelId > 0, "no challenge");

        require(playerChallenges[sessionId][levelId][msg.sender][slotId] == challenge, "invalid challenge address");

        zombieChallenge.unstake(sessionId, msg.sender, data);
    }

    // Claims earned tokens till today.
    // If claims before the time period, then it's just a claim.
    // If claims after the time period, then it withdraws staked tokens
    // and sets the time to be completed.
    function claim(uint256 sessionId, uint8 slotId, address challenge) external {
        require(slotId >= 0 && slotId < 3, "invalid slot id");
        require(sessionId > 0, "sessionId or challengeId is 0");
        require(sessions[sessionId].startTime > 0, "session doesen't exist");
        require(sessionChallenges[sessionId][challenge], "!session challenge");

        ZombieFarmChallengeInterface zombieChallenge = ZombieFarmChallengeInterface(challenge);

        // Level Id always will be valid as it was checked when Challenge added to Session
        uint8 levelId = zombieChallenge.getLevel(sessionId);

        require(playerChallenges[sessionId][levelId][msg.sender][slotId] == challenge, "invalid challenge address");

        zombieChallenge.claim(sessionId, msg.sender);
    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // internal functions
    //
    //////////////////////////////////////////////////////////////////////////////////

    function isLevelCompleted(uint256 sessionId, uint8 levelId, address staker)
        internal
        view
        returns(bool)
    {
        address[3] memory challenges = playerChallenges[sessionId][levelId][staker];

        for (uint8 i = 0; i < 3; i++) {
            if (challenges[i] == address(0)) {
                return false;
            }

            ZombieFarmChallengeInterface challenge = ZombieFarmChallengeInterface(challenges[i]);
            if (!challenge.isFullyCompleted(sessionId, staker)) {
                return false;
            }
        }
        return true;
    }


    /**
     * @dev session.startTime <= current time <= session.endTime
     */
    function isActive(uint256 sessionId) internal view returns(bool) {
        if (sessionId == 0) {
            return false;
        }
        return (now >= sessions[sessionId].startTime && now <= sessions[sessionId]
            .startTime + sessions[sessionId].period);
    }

    /**
     * @dev current time <= session.endTime
     */
    function isStarting(uint8 sessionId) internal view returns(bool) {
        if (sessionId == 0) {
            return false;
        }
        return (now <= sessions[sessionId].startTime + sessions[sessionId].period);
    }
}
