pragma solidity 0.6.7;

import "./../../../defi/StakeToken.sol";
import "./../interfaces/ZombieFarmChallengeInterface.sol";
import "./../interfaces/ZombieFarmInterface.sol";
import "./../helpers/VaultHandler.sol";
import "./../../../openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./../../../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../../../openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/// @notice Stake one token, and earn another token.
/// @dev WARNING! WARNING! WARNING
/// It only supports tokens with 18 decimals.
/// Otherwise you need to edit the `scaler`
contract SingleTokenChallenge is ZombieFarmChallengeInterface, ReentrancyGuard, VaultHandler  {
    using SafeERC20 for IERC20;

    address public zombieFarm;
    address payable public stakeHandler;

    uint256 public constant scaler = 10**18;
    uint256 public constant multiply = 1000000000; // The multiplier placement supports 0.00000001

    address public stakeToken;
    address public rewardToken;

    struct SessionChallenge {
        uint8   levelId;
        uint256 stakeAmount;        // Required amount to pass the level
        uint256 stakePeriod;        // Duration after which challenge considered to be completed.
        uint256 multiplier;         // Increase the progress
        uint256 totalAmount;        // Challenge has total deposit
    }

    struct PlayerChallenge {
        uint256 stakedTime;
        uint256 stakedDuration;

        uint256 amount;        		// amount of deposited token
        bool addedToPool;               // whether its been addedToPool in the session or not.
        bool completed;             // Was the challenge in the season completed by the player or not.
    }

    mapping(uint256 => SessionChallenge) public sessionChallenges;

    // session id => player address = PlayerChallenge
    mapping(uint256 => mapping (address => PlayerChallenge)) public playerParams;

    modifier onlyZombieFarm () {
	    require(msg.sender == zombieFarm, "only ZombieFarm can call");
	    _;
    }

    // Amount - is the users staked amount.
    // sessionAmount - is the total token amount.
    event Stake(
        address indexed staker,
        uint256 indexed sessionId,
        uint256 indexed levelId,
        uint256 amount
    );

    // amount is the user amount
    // sessionAmount - is the remaining total pool.
    event Unstake(
        address indexed staker,
        uint256 indexed sessionId,
        uint8   indexed levelId,
        uint256 amount
    );

    // amount total amount of tokens user claimed.
    event Claim(
        address indexed staker,
        uint256 indexed sessionId,
        uint8   indexed levelId,
        uint256 amount
    );

    constructor (address _zombieFarm, address _vault, address _stake, address _reward, address payable _stakeHandler) VaultHandler(_vault) public {
        require(_zombieFarm != address(0), "invalid _zombieFarm address");

        if (_stake != address(0)) {
            require(IERC20(_stake).decimals() == 18, "DECIMAL_WEI");
        }
        if (_reward != address(0)) {
            require(IERC20(_reward).decimals() == 18, "DECIMAL_WEI");
        }

        zombieFarm          = _zombieFarm;
        stakeToken          = _stake;
        rewardToken         = _reward;
        stakeHandler        = _stakeHandler;

        initReentrancyStatus();
    }

    /// @notice a new challenge of this challenge category was added to the session.
    /// @dev We are not validating most of the parameters, since we trust to the Owner.
    function addChallengeToSession(
        uint256 sessionId,
        uint8 levelId,
        bytes calldata data
    )
        external
        override
        onlyZombieFarm
    {
        require(sessionChallenges[sessionId].levelId == 0, "already added to the session");

        (uint256 reward, uint256 stakeAmount, uint256 stakePeriod, uint256 multiplier)
            = abi.decode(data, (uint256, uint256, uint256, uint256));
        require(reward > 0 && stakeAmount > 0 && stakePeriod > 0, "zero_value");

        // Challenge.stake is not null, means that earn is not null too.
        SessionChallenge storage session = sessionChallenges[sessionId];
        session.levelId             = levelId;
        session.stakeAmount         = stakeAmount;
        session.stakePeriod         = stakePeriod;
        session.multiplier          = multiplier;
        session.totalAmount         = 0;

        ZombieFarmInterface zombie  = ZombieFarmInterface(zombieFarm);
        (uint256 startTime,uint256 period,,,,) = zombie.sessions(sessionId);
        require(startTime > 0, "no session on zombie farm");

        StakeToken handler = StakeToken(stakeHandler);
        handler.newPeriod(sessionId, stakeToken, rewardToken, startTime, startTime + period, reward);
    }

    function getStakeAmount(bytes calldata data) external override view returns (uint256) {
        /// Staking amount
        (uint256 amount) = abi.decode(data, (uint256));
        require(amount > 0, "zero");

        return amount;
    }

    function getUnstakeAmount(bytes calldata data) external override view returns (uint256) {
        /// Staking amount
        (uint256 amount) = abi.decode(data, (uint256));
        require(amount > 0, "zero");

        return amount;
    }

    /// @dev The ZombieFarm calls this function when the session is active only.
    /// This function is not callable if time progress reached to the max level.
    function stake(uint256 sessionId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];

        /// Staking amount
        (uint256 amount) = abi.decode(data, (uint256));
        require(amount > 0, "zero");

        /// Session Parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        // if full completed, then user withdrew everything completely.
        // if time completed, then user can only unstake his tokens.
        require(!playerChallenge.completed &&
            !isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp), "time completed");

        uint256 total = amount + playerChallenge.amount;
        require(total >= sessionChallenge.stakeAmount, "invalid stake amount");

        // I add amount of deposits to session.amount
        // we add to total stakes, if user deposited >= stakeAmount.
        if (!playerChallenge.addedToPool) {
            playerChallenge.addedToPool = true;

            StakeToken handler = StakeToken(stakeHandler);
            handler.stake(sessionId, staker, sessionChallenge.stakeAmount);

            if ( total - sessionChallenge.stakeAmount > 0 ) {
                transferFromUserToVault(stakeToken, total - sessionChallenge.stakeAmount, staker);
            }

            playerChallenge.stakedTime = block.timestamp;
        }else {
            transferFromUserToVault(stakeToken, amount, staker);
        }

        // Amount holds only max session.stakeAmount
        // the remaining part goes to multiply
        playerChallenge.amount = total;
        sessionChallenge.totalAmount   += amount;

		emit Stake(staker, sessionId, sessionChallenge.levelId, amount);
    }

    function unstake(uint256 sessionId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        require(sessionChallenge.levelId > 0, "session does not exist");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];
        require(playerChallenge.amount > 0, "stake amount zero");

        /// Staking amount
        // (uint256 amount) = abi.decode(data, (uint256));
        // require(amount <= playerChallenge.amount, "can't unstake more than staked");

        StakeToken handler = StakeToken(stakeHandler);
        handler.claim(sessionId, staker);

        bool timeCompleted = isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp);

        ZombieFarmInterface zombie  = ZombieFarmInterface(zombieFarm);
        (uint256 startTime,uint256 period,,,,) = zombie.sessions(sessionId);

        // require(amount <= playerChallenge.amount, "unstake amout must equal stake!");
        if (block.timestamp < (startTime + period)) {

            require(timeCompleted, "TokenChallenge Withdraw after completion");

            if (!playerChallenge.completed) {
                playerChallenge.completed = true;
            }
        }

        handler.unstake(sessionId, staker, sessionChallenge.stakeAmount);
        playerChallenge.addedToPool = false;

        if (playerChallenge.amount > sessionChallenge.stakeAmount) {
            uint keepAmount = playerChallenge.amount - sessionChallenge.stakeAmount;
            transferFromVaultToUser(stakeToken, keepAmount, staker);
        }

        playerChallenge.amount = 0;
        emit Unstake(staker, sessionId, sessionChallenge.levelId, playerChallenge.amount);
    }

    /**
     * @dev You can't call this function, if timer is finished.
     */
    function claim(uint256 sessionId, address staker)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];
        require(!playerChallenge.completed && !isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp), "only withdraw");
        require(sessionChallenge.levelId > 0, "session does not exist");
        require(playerChallenge.amount > 0, "stake amount zero");

        StakeToken handler = StakeToken(stakeHandler);
        uint claimed = handler.claim(sessionId, staker);

        emit Claim(staker, sessionId, sessionChallenge.levelId, claimed);
    }

    /// Set session as complete
    function speedUp(uint256 sessionId, address staker)
        external
        override
        onlyZombieFarm
    {
        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        require(playerChallenge.amount >= sessionChallenge.stakeAmount, "didnt stake enough");

        playerChallenge.stakedDuration += sessionChallenge.stakePeriod;
    }

    function getLevel(uint256 sessionId) external override view returns(uint8) {
        return sessionChallenges[sessionId].levelId;
    }

    function isTimeCompleted(uint256 sessionId, address staker) external override view returns(bool) {
        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        return isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp);
    }

    function isTimeCompleted(
        SessionChallenge storage sessionChallenge,
        PlayerChallenge storage playerChallenge,
        uint256 currentTime
    )
        internal
        view
        returns(bool)
    {
        if (playerChallenge.stakedDuration >= sessionChallenge.stakePeriod) {
            return true;
        }

        if (playerChallenge.amount < sessionChallenge.stakeAmount) {
            return false;
        }

        uint256 duration    = (currentTime - playerChallenge.stakedTime);
        uint256 time        = playerChallenge.stakedDuration + duration;

        if (time >= sessionChallenge.stakePeriod) {
            return true;
        }

        uint256 endTime = getCompletedTime(sessionChallenge, playerChallenge);

        return (currentTime >= endTime);
    }

     function getCompletedTime(uint256 sessionId, address staker) external override view returns(uint256) {
        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];
        return getCompletedTime(sessionChallenge, playerChallenge);
    }

     function getCompletedTime(
        SessionChallenge storage sessionChallenge,
        PlayerChallenge storage playerChallenge
    )
        internal
        view
        returns(uint256)
    {
        if(playerChallenge.stakedTime == 0) {
            return 0;
        }

        uint256 overStake = 0;
        uint256 endTime   = playerChallenge.stakedTime + sessionChallenge.stakePeriod;

        if (playerChallenge.amount > sessionChallenge.stakeAmount) {
              overStake = playerChallenge.amount - sessionChallenge.stakeAmount;
        }

        uint256 overStakeSpeed = sessionChallenge.stakePeriod * overStake * sessionChallenge.multiplier / multiply / scaler;

        if (overStakeSpeed < (playerChallenge.stakedTime + sessionChallenge.stakePeriod)) {

            endTime = endTime - overStakeSpeed;
        }
        return endTime;
    }

    function isFullyCompleted(uint256 sessionId, address staker)
        public
        override
        view
        returns(bool)
    {
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        return playerChallenge.completed;
    }
}
