pragma solidity 0.6.7;

import "./ZombieFarmChallengeInterface.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Stake a one token, and earn another token
contract SingleTokenChallenge is ZombieFarmChallengeInterface, ReentrancyGuard  {
    using SafeERC20 for IERC20;

    address public stakeToken;
    address public earnToken;
    address public zombieFarm;
    /// @dev The account that keeps all ERC20 rewards
    address public pool;

    uint256 public constant scaler = 10**18;
    uint256 public constant multiply = 10000; // The multiplier placement supports 0.00001

    struct Params {
        address stake;
        address earn;
    }

    struct SessionChallenge {
        uint8 levelId;
        uint32 prevChallengeId;    // This is the previous challenge id if level is

        uint256 totalReward;
        uint256 stakeAmount;        // Required amount to pass the level
        uint256 stakePeriod;        // Duration after which challenge considered to be completed.
        uint256 multiplier;         // Increase the progress

        uint256 startTime;     		// session start in unixtimestamp
        uint256 endTime;

        uint256 claimed;       		// amount of already claimed CWS
        uint256 amount;        		// total amount of deposited tokens to the session by users

        uint256 rewardUnit;    		// reward per second = totalReward/period
        uint256 interestPerToken; 	// total earned interest per token since the beginning
        							// of the session
        uint256 claimedPerToken;    // total amount of tokens earned by a one staked token,
        							// since the beginning of the session
        uint256 lastInterestUpdate; // last time when claimedPerToken and interestPerToken
    }

    struct PlayerChallenge {
        uint256 stakedTime;
        uint256 stakedDuration;

        uint256 amount;        		// amount of deposited token
        bool counted;               // whether its been counted in the session or not.
        uint256 overStakeAmount;

        uint256 claimed;
        uint256 claimedTime;
        uint256 claimedReward;

        uint256 unpaidReward;       // Amount of token that contract should pay to user

        bool completed;             // Was the challenge in the season completed by the player or not.
    }

    mapping(uint32 => Params) public challenges;
    mapping(uint256 => mapping(uint32 => SessionChallenge)) public sessionChallenges;
    // session id => challenge id => player address = PlayerChallenge
    mapping(uint256 => mapping(uint32 => mapping (address => PlayerChallenge))) public playerParams;

    modifier onlyZombieFarm () {
	      require(msg.sender == zombieFarm, "only ZombieFarm can call");
	      _;
    }

    event SaveReward(
        uint256 indexed sessionId,
        uint8 indexed rewardType,
        address indexed token,
        uint256 generation,
        uint8 quality,
        uint256 imgId,
        uint256 amount
    );

    event RewardNft(
        uint256 indexed sessionId,
        uint8 rewardType,
        address indexed owner,
        uint256 indexed nftId,
        address token,
        uint256 generation,
        uint8 quality,
        uint256 imgId,
        uint256 amount
    );

    event Stake(
        address indexed staker,
        uint256 indexed sessionId,
        uint32 challengeId,
        uint256 amount,
        uint256 sessionAmount
    );

    event Unstake(
        address indexed staker,
        uint256 indexed sessionId,
        uint32 challengeId,
        uint256 amount,
        uint256 sessionAmount
    );

    event Claim(
        address indexed staker,
        uint256 indexed sessionId,
        uint32 challengeId,
        uint256 amount,
        uint256 sessionAmount
    );

    constructor (address _zombieFarm, address _pool) public {
        require(_zombieFarm != address(0), "invalid _zombieFarm address");
        require(_pool != address(0), "invalid _pool address");

        zombieFarm = _zombieFarm;
        pool = _pool;
    }

    /// @notice indicates that a new challenge of this challenge category is supported by Zombie Farm
    function newChallenge(uint32 id, bytes calldata data) external override onlyZombieFarm {
        require(challenges[id].stake == address(0), "challenge already exists");

        address _stake;
        address _earn;

        (_stake, _earn) = abi.decode(data, (address, address));
        require(_stake != address(0), "data.stake verification failed");
        require(_earn != address(0), "data.earn verification failed");

        challenges[id] = Params(_stake, _earn);
    }

    /// @notice a new challenge of this challenge category was added to the Season.
    function saveChallenge(
        uint256 sessionId,
        uint256 startTime,
        uint256 period,
        uint8 offset,
        bytes calldata data
    )
        external
        override
        onlyZombieFarm
    {
        uint32[5] memory id;
        uint8[5] memory levelId;
        uint256[5] memory reward;
        uint256[5] memory stakeAmount;
        uint256[5] memory stakePeriod;
        // multipliers could be 0.
        uint256[5] memory multiplier;
        uint32[5] memory prevChallengeId;

        (id, levelId, reward, stakeAmount, stakePeriod, multiplier, prevChallengeId) = abi
            .decode(data, (
            uint32[5],
            uint8[5],
            uint256[5],
            uint256[5],
            uint256[5],
            uint256[5],
            uint32[5]
            ));

        SessionChallenge storage session = sessionChallenges[sessionId][id[offset]];

        // Challenge.stake is not null, means that Challenge.earn is not null too.
        require(challenges[id[offset]].stake != address(0),
            "challenge does not exist");
        require(reward[offset] > 0, "reward should be more than 0");
        require(levelId[offset] > 0, "levelId should be more than 0");
        require(sessionId > 0, "seesionId should be more than 0");
        require(stakeAmount[offset] > 0, "stakeAmount should be above 0");
        require(stakePeriod[offset] > 0, "stakePeriod should be above 0");
        require(session.totalReward == 0, "challenge added to level before");
        require(startTime > 0 && period > 0, "session duration can't be 0");
        if (prevChallengeId[offset] > 0) {
            require(challenges[prevChallengeId[offset]].stake != address(0),
                "previous challenge incomplete");
        }

        session.levelId = levelId[offset];
        session.totalReward = reward[offset];
        session.stakeAmount = stakeAmount[offset];
        session.stakePeriod = stakePeriod[offset];
        session.multiplier = multiplier[offset];
        session.startTime = startTime;
        session.endTime = startTime + period;
        session.rewardUnit = reward[offset] / period;
        session.lastInterestUpdate = startTime;
        session.prevChallengeId = prevChallengeId[offset];
    }

    function stake(uint256 sessionId, uint32 challengeId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        /// General information regarding the Staking token and Earning token
        Params storage challenge = challenges[challengeId];

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        require(sessionChallenge.levelId > 0, "session does not exist");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];
        require(!playerChallenge.completed, "challange already completed");

        require(isActive(sessionChallenge.startTime, sessionChallenge.endTime),
            "Challenge should be active");

        // Previous Challenge should be completed
        if (sessionChallenge.prevChallengeId > 0) {
            PlayerChallenge storage playerPrevChallenge = playerParams[sessionId][sessionChallenge
                .prevChallengeId][staker];
            require(playerPrevChallenge.completed ||
                isCompleted(sessionChallenge, playerPrevChallenge, now),
                "last challenge not completed");
        }

        /// Staking amount
        uint256 amount;
        (amount) = abi.decode(data, (uint256));
        require(amount > 0, "invalid amount: cant be 0");

        require(!isCompleted(sessionChallenge, playerChallenge, block.timestamp),
            "time completed");

        updateInterestPerToken(sessionChallenge);

        /// Transfer tokens to the Smartcontract
        /// TODO add stake holding option. The stake holding option earns a passive income
        /// by user provided tokens.
        IERC20 _token = IERC20(challenge.stake);
        require(_token.balanceOf(staker) >= amount, "not enough staking token");
        uint256 preTotalAmount = _token.balanceOf(address(this));
        IERC20(_token).safeTransferFrom(staker, address(this), amount);
        uint256 actualAmount = _token.balanceOf(address(this)) - preTotalAmount;
        if (actualAmount != amount) {
            amount = actualAmount;
        }

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
        if (playerChallenge.amount >= sessionChallenge.stakeAmount) {
            _claim(sessionId, challengeId, staker);
            playerChallenge.claimedTime = block.timestamp;
        }

        uint256 total = amount + playerChallenge.amount + playerChallenge.overStakeAmount;

        // I add amount of deposits to session.amount
        // we add to total stakes, if user deposited >= stakeAmount.
        if (total >= sessionChallenge.stakeAmount && !playerChallenge.counted) {
    	      sessionChallenge.amount = sessionChallenge.amount + sessionChallenge.stakeAmount; // 10
            playerChallenge.counted = true;

            // Once the total stake amount has been increased, we update the earnings
            updateInterestPerToken(sessionChallenge);
        }

        // Amount holds only max session.stakeAmount
        // the remaining part goes to multiply
        if (total < sessionChallenge.stakeAmount) {
            playerChallenge.amount = total;
        } else {
            updateTimeProgress(sessionChallenge, playerChallenge);

            playerChallenge.amount = sessionChallenge.stakeAmount;
            playerChallenge.overStakeAmount = total - sessionChallenge.stakeAmount;
            playerChallenge.stakedTime = block.timestamp;

    		updateBalanceInterestPerToken(sessionChallenge.claimedPerToken, playerChallenge);
        }

		emit Stake(staker, sessionId, challengeId, amount, sessionChallenge.amount);
    }

    function unstake(uint256 sessionId, uint32 challengeId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        /// General information regarding the Staking token and Earning token
        Params storage challenge = challenges[challengeId];

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        require(sessionChallenge.levelId > 0, "session does not exist");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];
        require(!playerChallenge.completed, "already completed and claimed");
        require(playerChallenge.amount > 0, "stake amount zero");

        uint256 totalStake = playerChallenge.amount + playerChallenge.overStakeAmount;

        /// Staking amount
        uint256 amount;
        (amount) = abi.decode(data, (uint256));
        require(amount <= totalStake, "can't unstake more than staked");
        require(sessionChallenge.stakeAmount >= sessionChallenge.amount,
            "stake amount should be >= amount");

        updateInterestPerToken(sessionChallenge);

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
    		if (playerChallenge.amount >= sessionChallenge.stakeAmount) {
    		    _claim(sessionId, challengeId, staker);
            playerChallenge.claimedTime = block.timestamp;
    		}

        IERC20 _token = IERC20(challenge.stake);

        ///@dev reseting the timer if user unstaked any token
        playerChallenge.stakedDuration = 0;

        if (!isCompleted(sessionChallenge, playerChallenge, block.timestamp)) {
            if (amount > playerChallenge.overStakeAmount) {
                uint256 cut = amount - playerChallenge.overStakeAmount;
                playerChallenge.amount = playerChallenge.amount - cut;

                // player is removed from earning. so other users gets more.
                if (playerChallenge.amount < sessionChallenge.stakeAmount) {
                    sessionChallenge.amount = sessionChallenge
                        .amount - sessionChallenge.stakeAmount;
                    updateInterestPerToken(sessionChallenge);
                }
                playerChallenge.overStakeAmount = 0;
            } else {
                playerChallenge.overStakeAmount = playerChallenge.overStakeAmount - amount;
            }
            if (playerChallenge.amount == sessionChallenge.stakeAmount) {
                playerChallenge.stakedTime = now;
            } else {
                playerChallenge.stakedTime = 0;
                playerChallenge.counted = false;
            }

            /// Transfer tokens to the Smartcontract
            /// TODO add stake holding option. The stake holding option earns a passive income
            /// by user provided tokens.
            require(_token.balanceOf(address(this)) >= amount, "insufficient contract balances");
            require(_token.transfer(staker, amount), "transfer to staker failed");

            emit Unstake(staker, sessionId, challengeId, amount, sessionChallenge.amount);

        } else {
            playerChallenge.amount = 0;
            playerChallenge.overStakeAmount = 0;
            playerChallenge.stakedTime = 0;

            playerChallenge.completed = true;

            sessionChallenge.amount = sessionChallenge.amount - sessionChallenge.stakeAmount;

            updateInterestPerToken(sessionChallenge);

            /// Transfer tokens to the Smartcontract
            /// TODO add stake holding option. The stake holding option earns a passive income
            /// by user provided tokens.
            require(_token.balanceOf(address(this)) >= totalStake, "insufficient contract balances");
            require(_token.transfer(staker, totalStake), "transfer to staker failed");

            emit Unstake(staker, sessionId, challengeId, totalStake, sessionChallenge.amount);
        }
    }

    function claim(uint256 sessionId, uint32 challengeId, address staker)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        /// General information regarding the Staking token and Earning token
        Params storage challenge = challenges[challengeId];

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        require(sessionChallenge.levelId > 0, "session does not exist");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];
        require(!playerChallenge.completed, "already completed and claimed");
        require(playerChallenge.amount > 0, "stake amount zero");
        require(sessionChallenge.stakeAmount >= sessionChallenge.amount,
            "stakeAmount should be >= amount");

        updateInterestPerToken(sessionChallenge);

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
    		if (playerChallenge.amount >= sessionChallenge.stakeAmount) {
            _claim(sessionId, challengeId, staker);
            playerChallenge.claimedTime = block.timestamp;
    		}

        IERC20 _token = IERC20(challenge.stake);

        if (playerChallenge.amount >= sessionChallenge.stakeAmount &&
            isCompleted(sessionChallenge, playerChallenge, block.timestamp)) {

            uint256 totalStake = playerChallenge.amount + playerChallenge.overStakeAmount;

            playerChallenge.amount = 0;
            playerChallenge.overStakeAmount = 0;
            playerChallenge.stakedTime = 0;
            playerChallenge.stakedDuration = 0;

            playerChallenge.completed = true;

            sessionChallenge.amount = sessionChallenge.amount - sessionChallenge.stakeAmount;

            updateInterestPerToken(sessionChallenge);

            /// Transfer tokens to the Smartcontract
            /// TODO add stake holding option. The stake holding option earns a passive income
            /// by user provided tokens.
            require(_token.balanceOf(address(this)) >= totalStake,
                "insufficient contract balances");
            require(_token.transfer(staker, totalStake), "transfer to staker failed");

            emit Claim(staker, sessionId, challengeId, totalStake, sessionChallenge.amount);
        }
    }

    /// Set session as complete
    function complete(uint256 sessionId, uint32 challengeId, address staker)
        external
        override
        onlyZombieFarm
    {
        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];

        require(playerChallenge.amount >= sessionChallenge.stakeAmount, "didnt stake enough");

        playerChallenge.completed = true;
    }

    /// @dev updateInterestPerToken set's up the amount of tokens earned since the beginning
	/// of the session to 1 token. It also updates the portion of it for the user.
    /// @param sessionChallenge is this challenge
    function updateInterestPerToken(SessionChallenge storage sessionChallenge)
        internal
        returns(bool)
    {
        uint256 sessionCap = getSessionCap(sessionChallenge.startTime, sessionChallenge.endTime);
        if (sessionChallenge.lastInterestUpdate >= sessionCap) {
            return false;
        }

        // I calculate previous claimed rewards
        // (session.claimedPerToken += (now - session.lastInterestUpdate) * session.interestPerToken)
        sessionChallenge.claimedPerToken = sessionChallenge.claimedPerToken + (
        (sessionCap - sessionChallenge.lastInterestUpdate) * sessionChallenge.interestPerToken);

        // I record that interestPerToken is 0.1 CWS (rewardUnit/amount) in session.interestPerToken
        // I update the session.lastInterestUpdate to now
        if (sessionChallenge.amount == 0) {
            sessionChallenge.interestPerToken = 0;
        } else {
            sessionChallenge.interestPerToken = (sessionChallenge
                .rewardUnit * scaler) / sessionChallenge.amount; // 0.1
        }

        // we avoid sub. underflow, for calulating session.claimedPerToken
        sessionChallenge.lastInterestUpdate = sessionCap;
    }

    function getSessionCap(uint256 startTime, uint256 endTime) internal view returns(uint256) {
        if (!isActive(startTime, endTime)) {
            return endTime;
        }
        return block.timestamp;
    }

    function isActive(uint256 startTime, uint256 endTime) internal view returns(bool) {
        if (startTime == 0) {
            return false;
        }
        return (now >= startTime && now <= endTime);
    }

    function isCompleted(
        SessionChallenge storage sessionChallenge,
        PlayerChallenge storage playerChallenge,
        uint256 currentTime
    )
        internal
        view
        returns(bool)
    {
        uint256 time = playerChallenge.stakedDuration;

        if (playerChallenge.amount == sessionChallenge.stakeAmount) {
            if (playerChallenge.stakedTime > 0) {
                uint256 duration = (currentTime - playerChallenge.stakedTime);
                time = time + duration;

                if (playerChallenge.overStakeAmount > 0) {
                    time = time + (duration * ((playerChallenge
                        .overStakeAmount * sessionChallenge.multiplier) / multiply) / scaler);
                }
            }
        }
        return time >= sessionChallenge.stakePeriod;
    }

    function isFullyCompleted(uint256 sessionId, uint32 challengeId, address staker)
        external
        override
        view
        returns(bool)
    {
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];

        if (playerChallenge.completed) {
            return true;
        }
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];

        return isCompleted(sessionChallenge, playerChallenge, block.timestamp);
    }

    function updateTimeProgress(
        SessionChallenge storage sessionChallenge,
        PlayerChallenge storage playerChallenge
    )
        internal
    {
        // update time progress
        // previous stake time
        if (playerChallenge.amount >= sessionChallenge.stakeAmount &&
            playerChallenge.stakedTime > 0) {

            uint256 time = block.timestamp - playerChallenge.stakedTime;

            if (playerChallenge.overStakeAmount > 0) {
                time = time + (time * ((playerChallenge.overStakeAmount * sessionChallenge
                    .multiplier) / multiply) / scaler);
            }

            playerChallenge.stakedDuration = playerChallenge.stakedDuration + time;
            if (playerChallenge.stakedDuration >= sessionChallenge.stakePeriod) {
                playerChallenge.completed = true;
            }
        }
    }

    function updateBalanceInterestPerToken(
        uint256 claimedPerToken,
        PlayerChallenge storage playerChallenge
    )
        internal
        returns(bool)
    {
        playerChallenge.claimedReward = claimedPerToken * playerChallenge.amount / scaler; // 0
    }

    function _claim(uint256 sessionId, uint32 challengeId, address staker) internal returns(bool) {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];

        require(playerChallenge.amount > 0, "nothing to claim");

        uint256 interest = calculateInterest(sessionId, challengeId, staker);
        if (interest == 0) {
            return false;
        }

        Params storage challenge = challenges[challengeId];

        IERC20 _token = IERC20(challenge.earn);

        uint256 contractBalance = _token.balanceOf(pool);

        if (contractBalance < interest) {
            playerChallenge.unpaidReward = (interest - contractBalance) + playerChallenge
                .unpaidReward;
        }

        // we avoid sub. underflow, for calulating session.claimedPerToken
        if (isActive(sessionChallenge.startTime, sessionChallenge.endTime) == false) {
            playerChallenge.claimedTime = sessionChallenge.endTime;
        } else {
            playerChallenge.claimedTime = block.timestamp;
        }
        sessionChallenge.claimed = sessionChallenge.claimed + interest;
        playerChallenge.claimed = playerChallenge.claimed + interest;

        if (interest > contractBalance) {
            IERC20(_token).safeTransferFrom(pool, staker, contractBalance);
        } else {
            IERC20(_token).safeTransferFrom(pool, staker, interest);
        }

        //emit Claimed(challenge.earn, staker, sessionId, challengeId, interest, block.timestamp);
        return true;
    }

    function calculateInterest(uint256 sessionId, uint32 challengeId, address staker)
        internal
        view
        returns(uint256)
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];

    		// How much of total deposit is belong to player as a floating number
    		if (playerChallenge.amount == 0 || sessionChallenge.amount == 0) {
            return 0;
    		}

        uint256 sessionCap = block.timestamp;
        if (isActive(sessionChallenge.startTime, sessionChallenge.endTime) == false) {
            sessionCap = sessionChallenge.endTime;

          	// claimed after session expire, means no any claimables
          	if (playerChallenge.claimedTime >= sessionCap) {
                return 0;
            }
        }

        uint256 claimedPerToken = sessionChallenge.claimedPerToken + (
            (sessionCap - sessionChallenge.lastInterestUpdate) * sessionChallenge.interestPerToken);

        // (balance * total claimable) - user deposit earned amount per token - balance.claimedTime
        uint256 interest = ((playerChallenge
            .amount * claimedPerToken) / scaler) - playerChallenge.claimedReward;

        return interest;
    }

    function getIdAndLevel(uint8 offset, bytes calldata data)
        external
        override
        view
        onlyZombieFarm
        returns(uint32, uint8)
    {
        uint32[5] memory id;
        uint8[5] memory levelId;
        uint256[5] memory reward;
        uint256[5] memory stakeAmount;
        uint256[5] memory stakePeriod;
        uint256[5] memory multiplier;
        uint32[5] memory prevChallengeId;

        (id, levelId, reward, stakeAmount, stakePeriod, multiplier, prevChallengeId) = abi
            .decode(data, (
            uint32[5],
            uint8[5],
            uint256[5],
            uint256[5],
            uint256[5],
            uint256[5],
            uint32[5]
            ));


        return (id[offset], levelId[offset]);
    }

    function getLevel(uint256 sessionId, uint32 challengeId)
        external
        override
        view
        onlyZombieFarm
        returns(uint8)
    {
        return sessionChallenges[sessionId][challengeId].levelId;
    }

    function payDebt(uint256 sessionId,  uint32 challengeId, address staker)
        external
        nonReentrant
    {
        require(staker == msg.sender, "only staker can call");
        
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];
        Params storage challenge = challenges[challengeId];

        if (playerChallenge.unpaidReward > 0) {
          IERC20 _token = IERC20(challenge.earn);
          uint256 contractBalance = _token.balanceOf(pool);
          require(contractBalance >= playerChallenge.unpaidReward, "insufficient contract balance");

          IERC20(_token).safeTransferFrom(pool, staker, playerChallenge.unpaidReward);

          // playerChallenge.claimedTime = block.timestamp;
          sessionChallenge.claimed += playerChallenge.unpaidReward;
          playerChallenge.claimed += playerChallenge.unpaidReward;
          playerChallenge.unpaidReward = 0;
        }
    }
}
