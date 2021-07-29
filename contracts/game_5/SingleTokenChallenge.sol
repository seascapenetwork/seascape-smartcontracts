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

    uint256 private constant scaler = 10**18;

    struct Params {
        address stake;
        address earn;
    }

    struct SessionParams {
        uint8 levelId;
        uint256 totalReward;
        uint256 stakeAmount;        // Required amount to pass the level
        uint256 stakePeriod;        // Duration after which challenge considered to be completed.
        
        uint256 startTime;     		// session start in unixtimestamp
        uint256 period;

		uint256 claimed;       		// amount of already claimed CWS
		uint256 amount;        		// total amount of deposited tokens to the session by users
		
        uint256 rewardUnit;    		// reward per second = totalReward/period
		uint256 interestPerToken; 	// total earned interest per token since the beginning
									// of the session
		uint256 claimedPerToken;    // total amount of tokens earned by a one staked token,
									// since the beginning of the session
		uint256 lastInterestUpdate; // last time when claimedPerToken and interestPerToken
    }

    struct PlayerParams {
        uint256 stakedTime;
        uint256 stakedDuration;

        uint256 amount;        		// amount of deposited token
        bool counted;               // whether its been counted in the session or not.
        uint256 overStakeAmount;

        uint256 claimed;
		uint256 claimedTime;
		uint256 claimedReward;

		uint256 unpaidReward;       // Amount of token that contract should pay to user
    }

    mapping(uint32 => Params) public challenges;
    mapping(uint256 => mapping(uint32 => SessionParams)) public sessionChallenges;
    mapping(uint256 => mapping(uint32 => mapping (address => PlayerParams))) public playerParams;

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

    function saveChallenge(uint256 sessionId, uint256 startTime, uint256 period, uint8 offset, bytes calldata data) external override onlyZombieFarm {
        uint32[5] memory id;
        uint8[5] memory levelId;
        uint256[5] memory reward;
        uint256[5] memory stakeAmount;
        uint256[5] memory stakePeriod;

        (id, levelId, reward, stakeAmount, stakePeriod) = 
            abi.decode(data, (uint32[5], uint8[5], uint256[5], uint256[5], uint256[5])); 

        Params storage challenge = challenges[id[offset]];

        SessionParams storage session = sessionChallenges[sessionId][id[offset]];

        // Challenge.stake is not null, means that Challenge.earn is not null too.
        require(challenge.stake != address(0), "single token.challenge is not existing");
        require(reward[offset] > 0, "single token.reward==0");
        require(levelId[offset] > 0, "single token.level==0");
        require(sessionId > 0, "single token.session id==0");
        require(stakeAmount[offset] > 0, "single token.stake amount==0");
        require(stakePeriod[offset] > 0, "single token.stake period==0");
        require(session.totalReward == 0, "challenge to level added before");
        require(startTime > 0 && period > 0, "single token: session time==0");

        session.levelId = levelId[offset];
        session.totalReward = reward[offset];
        session.stakeAmount = stakeAmount[offset];
        session.stakePeriod = stakePeriod[offset];
        session.startTime = startTime;
        session.period = period;
		session.rewardUnit = reward[offset] / period;	
        session.lastInterestUpdate = startTime;
    }

    /**
        Users are able to stake any amount of tokens.
        However their staking start to count after reaching sessionParams.stakeAmount

        If users add more than sessionParams.stakeAmount, then that amount will be still equal to sessionParams.stakeAmount.
        But additional Tokens will be used for timer multiplication. 
            Multiplication:
            the SessionParams hold the multipler per token.
            And the PlayerParams holds the additional tokens of the user.

            Then we have a TODO to update the multiplication.
     */
    function stake(uint256 sessionId, uint32 challengeId, address staker, bytes calldata data) external override onlyZombieFarm {
        /// General information regarding the Staking token and Earning token
        Params storage challenge = challenges[challengeId];

        /// Session Parameters
        SessionParams storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        require(sessionChallenge.levelId > 0, "single token:no exist session");

        /// Player parameters
        PlayerParams storage playerChallenge = playerParams[sessionId][challengeId][staker];

        /// Staking amount
        uint256 amount;
        (amount) = abi.decode(data, (uint256)); 
        require(amount > 0, "single token:amount==0");

        // user had 200, and now 250
        uint256 total = amount + playerChallenge.amount;

        updateInterestPerToken(sessionId, challengeId);

        /// Transfer tokens to the Smartcontract
        /// TODO add stake holding option. The stake holding option earns a passive income
        /// by user provided tokens.
		IERC20 _token = IERC20(challenge.stake);		
		require(_token.balanceOf(staker) >= amount,                 "not enough");
		require(_token.transferFrom(staker, address(this), amount), "transferFrom");

		// claim tokens if any tokens were earned till now.
		if (playerChallenge.amount >= sessionChallenge.stakeAmount) {
			_claim(sessionId, challengeId, staker);
            playerChallenge.claimedTime = block.timestamp;
		}

		// interest per token is updated. maybe need to withdraw out?
        if (total >= sessionChallenge.stakeAmount) {
            // I add amount of deposits to session.amount
            if (!playerChallenge.counted) {
    		    sessionChallenge.amount = sessionChallenge.amount + sessionChallenge.stakeAmount; // 10
                playerChallenge.counted = true;
            }

		    updateInterestPerToken(sessionId, challengeId);
        }
		
        // Amount holds only max session.stakeAmount
        // the remaining part goes to multiply
        // for example:
        // user deposited 100, and stake amount is 200
        if (total < sessionChallenge.stakeAmount) {
            playerChallenge.amount = total;
        } else {
            playerChallenge.amount = sessionChallenge.stakeAmount; 
            playerChallenge.overStakeAmount = total - sessionChallenge.stakeAmount;

    		updateBalanceInterestPerToken(sessionId, challengeId, staker);
        }

		//emit Stake(_session.stakingToken, staker, _sessionId, _amount, block.timestamp, _session.amount);
    }

    /// @dev updateInterestPerToken set's up the amount of tokens earned since the beginning
	/// of the session to 1 token. It also updates the portion of it for the user.
	/// @param sessionId is a session id
    /// @param challengeId is this challenge
	function updateInterestPerToken(uint256 sessionId, uint32 challengeId) internal returns(bool) {
        SessionParams storage sessionChallenge = sessionChallenges[sessionId][challengeId];

		uint256 sessionCap = block.timestamp;
		if (isActive(sessionChallenge.startTime, sessionChallenge.period) == false) {
			sessionCap = sessionChallenge.startTime + sessionChallenge.period;
		}

        // I calculate previous claimed rewards
        // (session.claimedPerToken += (now - session.lastInterestUpdate) * session.interestPerToken)
		sessionChallenge.claimedPerToken = sessionChallenge.claimedPerToken + (
			sessionCap - (sessionChallenge.lastInterestUpdate * sessionChallenge.interestPerToken));

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

    function isActive(uint256 startTime, uint256 period) internal view returns(bool) {
        if (startTime == 0) {
            return false;
        }
        return (now >= startTime && now <= startTime + period);
    }

	function updateBalanceInterestPerToken(uint256 sessionId, uint32 challengeId, address staker) internal returns(bool) {
        SessionParams storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        PlayerParams storage playerChallenge = playerParams[sessionId][challengeId][staker];

		// also, need to attach to alex, 
		// that previous earning (session.claimedPerToken) is 0.
		playerChallenge.claimedReward = sessionChallenge.claimedPerToken * playerChallenge.amount / scaler; // 0
	}

    function _claim(uint256 sessionId, uint32 challengeId, address staker) internal returns(bool) {
        SessionParams storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        PlayerParams storage playerChallenge = playerParams[sessionId][challengeId][staker];

		require(playerChallenge.amount > 0, "no deposit");
		
		uint256 interest = calculateInterest(sessionId, challengeId, staker);
		if (interest == 0) {
			return false;
		}

        Params storage challenge = challenges[challengeId];

		IERC20 _token = IERC20(challenge.earn);

		uint256 contractBalance = _token.balanceOf(pool);

		if (interest > 0 && contractBalance < interest) {
			playerChallenge.unpaidReward = (interest - contractBalance) + playerChallenge.unpaidReward;
		}

		// we avoid sub. underflow, for calulating session.claimedPerToken
		if (isActive(sessionId, challengeId) == false) {
			playerChallenge.claimedTime = sessionChallenge.startTime + sessionChallenge.period;
		} else {
			playerChallenge.claimedTime = block.timestamp;
		}
		sessionChallenge.claimed     = sessionChallenge.claimed + interest;
		playerChallenge.claimed     = playerChallenge.claimed + interest;
		
        if (interest > contractBalance) {
            _token.transferFrom(pool, staker, contractBalance);
        } else {
            _token.transferFrom(pool, staker, interest);
        }
			
		//emit Claimed(challenge.earn, staker, sessionId, challengeId, interest, block.timestamp);
		return true;
    }

    function calculateInterest(uint256 sessionId, uint32 challengeId, address staker) internal view returns(uint256) {	    
        SessionParams storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        PlayerParams storage playerChallenge = playerParams[sessionId][challengeId][staker];

		// How much of total deposit is belong to player as a floating number
		if (playerChallenge.amount == 0 || sessionChallenge.amount == 0) {
			return 0;
		}

		uint256 sessionCap = block.timestamp;
		if (isActive(sessionId, challengeId) == false) {
			sessionCap = sessionChallenge.startTime + sessionChallenge.period;

			// claimed after session expire, means no any claimables
			if (playerChallenge.claimedTime >= sessionCap) {
				return 0;
			}
		}

		uint256 claimedPerToken = sessionChallenge.claimedPerToken + (
			(sessionCap - sessionChallenge.lastInterestUpdate) * sessionChallenge.interestPerToken);
		
		// (balance * total claimable) - user deposit earned amount per token - balance.claimedTime
    	uint256 interest = ((playerChallenge.amount * claimedPerToken) / scaler) - playerChallenge.claimedReward;

		return interest;
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

    function getLevel(uint256 sessionId, uint32 challengeId) external override view onlyZombieFarm returns(uint8) {
        return sessionChallenges[sessionId][challengeId].levelId;
    }
}