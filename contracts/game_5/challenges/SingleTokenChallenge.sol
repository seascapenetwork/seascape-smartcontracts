pragma solidity 0.6.7;

import "./../interfaces/ZombieFarmChallengeInterface.sol";
import "./../interfaces/ZombieFarmInterface.sol";
import "./../helpers/VaultHandler.sol";
import "./../../openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Stake one token, and earn another token.
contract SingleTokenChallenge is ZombieFarmChallengeInterface, ReentrancyGuard, VaultHandler  {
    address public zombieFarm;

    uint256 public constant scaler = 10**18;
    uint256 public constant multiply = 10000; // The multiplier placement supports 0.00001

    // This challenge specific parameters.
    address public stakeToken;
    address public earnToken;

    struct SessionChallenge {
        uint8 levelId;

        uint256 totalReward;
        uint256 stakeAmount;        // Required amount to pass the level
        uint256 stakePeriod;        // Duration after which challenge considered to be completed.
        uint256 multiplier;         // Increase the progress

        uint256 claimed;       		// amount of already claimed CWS
        uint256 amount;        		// total amount of deposited tokens to the session by users

        uint256 rewardUnit;    		// reward per second = totalReward/period
        uint256 interestPerToken; 	// total earned interest per token since the beginning
        							// of the session
        uint256 claimedPerToken;    // total amount of tokens earned by a one staked token,
        							// since the beginning of the session
                                    // scaled format.
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
        uint256 amount,             
        uint256 sessionAmount
    );

    // amount is the user amount
    // sessionAmount - is the remaining total pool.
    event Unstake(
        address indexed staker,
        uint256 indexed sessionId,
        uint8   indexed levelId,
        uint256 amount,
        uint256 sessionAmount
    );

    // amount total amount of tokens user claimed.
    event Claim(
        address indexed staker,
        uint256 indexed sessionId,
        uint8   indexed levelId,
        uint256 amount,
        uint256 sessionAmount
    );

    constructor (address _zombieFarm, address _vault, address _stake, address _earn) VaultHandler(_vault) public {
        require(_zombieFarm != address(0), "invalid _zombieFarm address");
        require(_stake      != address(0), "data.stake verification failed");
        require(_earn       != address(0), "data.earn verification failed");

        zombieFarm          = _zombieFarm;
        stakeToken          = _stake;
        earnToken           = _earn;
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
        require(sessionChallenges[sessionId].totalReward == 0, "already added to the session");

        (uint256 reward, uint256 stakeAmount, uint256 stakePeriod, uint256 multiplier) 
            = abi.decode(data, (uint256, uint256, uint256, uint256));
        require(reward > 0 && stakeAmount > 0 && stakePeriod > 0, "zero_value");

        // Challenge.stake is not null, means that earn is not null too.
        SessionChallenge storage session = sessionChallenges[sessionId];
        session.levelId             = levelId;
        session.totalReward         = reward;
        session.stakeAmount         = stakeAmount;
        session.stakePeriod         = stakePeriod;
        session.multiplier          = multiplier;

        ZombieFarmInterface zombie  = ZombieFarmInterface(zombieFarm);
        (uint256 startTime,uint256 period,,,,) = zombie.sessions(sessionId);
        require(startTime > 0, "no session on zombie farm");

        session.rewardUnit          = reward / period;
        session.lastInterestUpdate  = startTime;
    }

    /// @dev The ZombieFarm calls this function when the session is active only.
    function stake(uint256 sessionId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        /// Staking amount
        (uint256 amount) = abi.decode(data, (uint256));
        require(amount > 0, "invalid amount: cant be 0");

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        // if full completed, then user withdrew everything completely.
        // if time completed, then user can only unstake his tokens.
        require(!isFullyCompleted(sessionId, staker) &&
            !isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp), "time completed");

        updateInterestPerToken(sessionId, sessionChallenge);

        /// Transfer tokens to the Smartcontract
        amount = transferFromUserToVault(stakeToken, amount, staker);

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
        if (playerChallenge.amount >= sessionChallenge.stakeAmount) {
            _claim(sessionId, staker);
            playerChallenge.claimedTime = block.timestamp;
        }

        uint256 total = amount + playerChallenge.amount + playerChallenge.overStakeAmount;

        // I add amount of deposits to session.amount
        // we add to total stakes, if user deposited >= stakeAmount.
        if (total >= sessionChallenge.stakeAmount && !playerChallenge.counted) {
    	    sessionChallenge.amount += sessionChallenge.stakeAmount; // 10
            playerChallenge.counted = true;

            // Once the total stake amount has been increased, we update the earnings
            updateInterestPerToken(sessionId, sessionChallenge);
        }

        playerChallenge.stakedTime = block.timestamp;

        // Amount holds only max session.stakeAmount
        // the remaining part goes to multiply
        if (total < sessionChallenge.stakeAmount) {
            playerChallenge.amount = total;
            playerChallenge.overStakeAmount = 0;
        } else {
            playerChallenge.amount = sessionChallenge.stakeAmount;
            playerChallenge.overStakeAmount = total - sessionChallenge.stakeAmount;

    		updateBalanceInterestPerToken(sessionChallenge.claimedPerToken, playerChallenge);
        }

		emit Stake(staker, sessionId, sessionChallenge.levelId, amount, sessionChallenge.amount);
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

        uint256 totalStake = playerChallenge.amount + playerChallenge.overStakeAmount;

        /// Staking amount
        (uint256 amount) = abi.decode(data, (uint256));
        require(amount <= totalStake, "can't unstake more than staked");

        updateInterestPerToken(sessionId, sessionChallenge);

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
    	if (playerChallenge.amount >= sessionChallenge.stakeAmount) {
    		_claim(sessionId, staker);
            playerChallenge.claimedTime = block.timestamp;
    	}

        bool timeCompleted = isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp);

        playerChallenge.stakedDuration = 0;
        playerChallenge.stakedTime = now;

        if (!timeCompleted) {
            // deducting from the over stake. do not touching the main part.
            if (amount > playerChallenge.overStakeAmount) {
                uint256 cut = amount - playerChallenge.overStakeAmount;
                playerChallenge.amount = playerChallenge.amount - cut;

                // player is removed from earning. so other users gets more.
                if (playerChallenge.amount < sessionChallenge.stakeAmount) {
                    sessionChallenge.amount = sessionChallenge
                        .amount - sessionChallenge.stakeAmount;
                    updateInterestPerToken(sessionId, sessionChallenge);
                }
                playerChallenge.overStakeAmount = 0;
            } else {
                playerChallenge.overStakeAmount = playerChallenge.overStakeAmount - amount;
            }
            if (playerChallenge.amount != sessionChallenge.stakeAmount) {
                playerChallenge.counted = false;
            }

            uint256 actualAmount = transferFromVaultToUser(stakeToken, amount, staker);
            if (actualAmount != amount) {
                // The rest is withdrawn manually.
                amount = actualAmount;
            }

            emit Unstake(staker, sessionId, sessionChallenge.levelId, amount, sessionChallenge.amount);

        } else {
            playerChallenge.amount = 0;
            playerChallenge.overStakeAmount = 0;
            playerChallenge.stakedTime = 0;

            playerChallenge.completed = true;

            sessionChallenge.amount = sessionChallenge.amount - sessionChallenge.stakeAmount;

            updateInterestPerToken(sessionId, sessionChallenge);
            
            uint256 actualAmount = transferFromVaultToUser(stakeToken, totalStake, staker);
            if (actualAmount != totalStake) {
                // The rest is withdrawn manually.
                totalStake = actualAmount;
            }
            emit Unstake(staker, sessionId, sessionChallenge.levelId, totalStake, sessionChallenge.amount);
        }
    }

    function claim(uint256 sessionId, address staker)
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
        require(!playerChallenge.completed, "already completed and claimed");
        require(playerChallenge.amount > 0, "stake amount zero");
        require(sessionChallenge.stakeAmount >= sessionChallenge.amount,
            "stakeAmount should be >= amount");

        updateInterestPerToken(sessionId, sessionChallenge);

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
    	if (playerChallenge.amount >= sessionChallenge.stakeAmount) {
            _claim(sessionId, staker);
            playerChallenge.claimedTime = block.timestamp;
    	}

        if (playerChallenge.amount >= sessionChallenge.stakeAmount &&
            isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp)) {

            uint256 totalStake = playerChallenge.amount + playerChallenge.overStakeAmount;

            playerChallenge.amount = 0;
            playerChallenge.overStakeAmount = 0;
            playerChallenge.stakedTime = 0;
            playerChallenge.stakedDuration = 0;

            playerChallenge.completed = true;

            sessionChallenge.amount = sessionChallenge.amount - sessionChallenge.stakeAmount;

            updateInterestPerToken(sessionId, sessionChallenge);

            uint256 actualAmount = transferFromVaultToUser(stakeToken, totalStake, staker);
            if (actualAmount != totalStake) {
                // The rest is withdrawn manually.
                totalStake = actualAmount;
            }

            emit Claim(staker, sessionId, sessionChallenge.levelId, totalStake, sessionChallenge.amount);
        }
    }


    function payDebt(uint256 sessionId, address staker)
        external
        nonReentrant
    {
        require(staker == msg.sender, "only staker can call");

        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        if (playerChallenge.unpaidReward > 0) {
          uint256 contractBalance = tokenBalanceOfVault(earnToken);
          require(contractBalance >= playerChallenge.unpaidReward, "insufficient contract balance");

          transferFromVaultToUser(earnToken, playerChallenge.unpaidReward, staker);

          // playerChallenge.claimedTime = block.timestamp;
          sessionChallenge.claimed += playerChallenge.unpaidReward;
          playerChallenge.claimed += playerChallenge.unpaidReward;
          playerChallenge.unpaidReward = 0;
        }
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

    /// @dev updateInterestPerToken set's up the amount of tokens earned since the beginning
	/// of the session to 1 token. It also updates the portion of it for the user.
    /// @param sessionChallenge is this challenge
    function updateInterestPerToken(uint256 sessionId, SessionChallenge storage sessionChallenge)
        internal
        returns(bool)
    {
        ZombieFarmInterface zombie = ZombieFarmInterface(zombieFarm);
        (uint256 startTime, uint256 period, , , , ) = zombie.sessions(sessionId);

        uint256 sessionCap = getSessionCap(startTime, startTime + period);
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
            sessionChallenge.interestPerToken = (sessionChallenge.rewardUnit * scaler) / sessionChallenge.amount; // 0.1
        }

        // we avoid sub. underflow, for calulating session.claimedPerToken
        sessionChallenge.lastInterestUpdate = sessionCap;
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

    function _claim(uint256 sessionId, address staker) internal returns(bool) {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        require(playerChallenge.amount > 0, "nothing to claim");

        uint256 interest = calculateInterest(sessionId, staker);
        if (interest == 0) {
            return false;
        }

        uint256 contractBalance = tokenBalanceOfVault(earnToken);

        if (contractBalance < interest) {
            playerChallenge.unpaidReward = (interest - contractBalance) + playerChallenge
                .unpaidReward;
        }

        // we avoid sub. underflow, for calulating session.claimedPerToken
        ZombieFarmInterface zombie  = ZombieFarmInterface(zombieFarm);
        (uint256 startTime,uint256 period,,,,) = zombie.sessions(sessionId);
        if (isActive(startTime, startTime + period) == false) {
            playerChallenge.claimedTime = startTime + period;
        } else {
            playerChallenge.claimedTime = block.timestamp;
        }
        sessionChallenge.claimed = sessionChallenge.claimed + interest;
        playerChallenge.claimed = playerChallenge.claimed + interest;

        if (interest > contractBalance) {
            transferFromVaultToUser(earnToken, contractBalance, staker);
        } else {
            transferFromVaultToUser(earnToken, interest, staker);
        }

        emit Claim(staker, sessionId, sessionChallenge.levelId, interest, sessionChallenge.amount);

        return true;
    }

    function calculateInterest(uint256 sessionId, address staker)
        internal
        view
        returns(uint256)
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

    		// How much of total deposit is belong to player as a floating number
    		if (playerChallenge.amount == 0 || sessionChallenge.amount == 0) {
            return 0;
    		}

        uint256 sessionCap = block.timestamp;
        ZombieFarmInterface zombie  = ZombieFarmInterface(zombieFarm);
        (uint256 startTime,uint256 period,,,,) = zombie.sessions(sessionId);
        if (isActive(startTime, startTime + period) == false) {
            sessionCap = startTime + period;

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

    function isTimeCompleted(uint256 sessionId, address staker) external view returns(bool) {
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
        uint256 time = playerChallenge.stakedDuration;
        if (time >= sessionChallenge.stakePeriod) {
            return true;
        }

        if (playerChallenge.amount == sessionChallenge.stakeAmount) {
            if (playerChallenge.stakedTime > 0) {
                uint256 duration    = (currentTime - playerChallenge.stakedTime);
                time                = time + duration;

                if (playerChallenge.overStakeAmount > 0) {
                    time = time + (duration * ((playerChallenge
                        .overStakeAmount * sessionChallenge.multiplier) / multiply) / scaler);
                }
            }
        }
        return time >= sessionChallenge.stakePeriod;
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
