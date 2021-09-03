pragma solidity 0.6.7;

import "./ZombieFarmChallengeInterface.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";


/// @notice Stake a single scape NFT and erc20 token, and earn ERC20 token
///
/// STAKING:
/// First time whe user deposits his nft:
///     It receives nft id, signature and amount of staking.
/// If user's nft is in the game, then deposit accepts only
///     amount.
contract ScapeNftTokenChallenge is ZombieFarmChallengeInterface, Ownable {

    // The seascape NFT address
    address scape;

    address stakeToken;
    address earnToken;
    address zombieFarm;
    /// @dev The account that keeps all ERC20 rewards
    address public pool;

    uint256 private constant scaler = 10**18;
    uint256 private constant multiply = 10000; // The multiplier placement supports 0.00001
    uint256 public nonce = 0;

    struct Category {
        address stake;
        address earn;
        uint8 imgIdAmount;      // The supported nft category (0 if not filtered)
        uint256[5] imgId;       // Image ids for determining image category
        int8 generation;        // Generation (-1 if not filtered)
        uint8 quality;          // Quality (0 if not filtered)
        bool burn;
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
    		uint256 interestPerToken; 	// total earned interest per token since session started
    		uint256 claimedPerToken;    // total amount of tokens earned by a one staked token,
									// since the beginning of the session
        uint256 lastInterestUpdate; // last time when claimedPerToken and interestPerToken
    }

    struct PlayerChallenge {
        uint256 stakedTime;
        uint256 stakedDuration;

        uint256 amount;        		// amount of deposited token
        bool counted;               // true if stake amount is added to total season amount
        uint256 overStakeAmount;

        uint256 claimed;
		    uint256 claimedTime;
		    uint256 claimedReward;

		    uint256 unpaidReward;       // Amount of token that contract should pay to user

        bool completed;             // true if challenge in the season was completed by the player

        uint256 nftId;              // Nft that user staked in.
    }

    mapping(uint32 => Category) public challenges;
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
        uint256 sessionAmount,
        uint256 nftId
    );
    event Unstake(
        address indexed staker,
        uint256 indexed sessionId,
        uint32 challengeId,
        uint256 amount,
        uint256 sessionAmount,
        uint256 nftId
    );
    event Claim(
      address indexed staker,
      uint256 indexed sessionId,
      uint32 challengeId,
      uint256 amount,
      uint256 sessionAmount
    );

    constructor (address _zombieFarm, address _scape, address _pool) public {
        require(_zombieFarm != address(0), "invalid _zombieFarm address");
        require(_scape != address(0), "invalid _scape address");
        require(_pool != address(0), "invalid _pool address");

        zombieFarm = _zombieFarm;
        scape = _scape;
        pool = _pool;
    }

    /// @notice support a new Challenge of this category by Zombie Farm
    /// Each Challenge of this category is different based on their
    /// earning, staking or scape nft parameter.
    function newChallenge(uint32 id, bytes calldata data)
        external
        override
        onlyZombieFarm
    {
        require(challenges[id].stake == address(0), "single token challenge exists");

        address _earn;

        address _stake;

        uint8 _imgIdAmount;      // The supported nft category (0 if not filtered)
        uint256[5] memory _imgId;       // Image ids for determining image category
        int8 _generation;        // Generation (-1 if not filtered)
        uint8 _quality;          // Quality (0 if not filtered)
        bool _burn;

        (_stake, _earn, _imgIdAmount, _imgId, _generation, _quality, _burn) = abi
            .decode(data, (address, address, uint8, uint256[5], int8, uint8, bool));

        require(_earn != address(0), "data.earn verification failed");
        require(_stake != address(0), "data.stake verification failed");
        require(_quality <= 5, "data.quality verificati failed");
        require(_imgIdAmount <= 5, "data.imgAmount verificat failed");
        require(_generation >= -1, "data.gen verification failed");

        challenges[id] = Category(
            _stake, _earn, _imgIdAmount, _imgId, _generation, _quality, _burn);
    }

    /// @notice The challenges of this category were added to the Zombie Farm season
    function saveChallenge(
        uint256 sessionId,
        uint256 startTime,
        uint256 period,
        uint8 offset,
        bytes calldata data
    )
        external override onlyZombieFarm {
        uint32[5] memory id;                    // Challenge Id
        uint8[5] memory levelId;                // Level of Zombie Farm to which challenge was added
        uint32[5] memory prevChallengeId;       // Previous Level Challenge that player should complete
        uint256[5] memory reward;               // Reward pool that players are farming
        uint256[5] memory stakeAmount;          // Staking token amount
        uint256[5] memory stakePeriod;          // Staking period
        // multipliers could be 0.
        uint256[5] memory multiplier;           // The time progress speed if the player stakes more

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
            "single token.challenge no exist");
        require(reward[offset] > 0, "single token.reward==0");
        require(levelId[offset] > 0, "single token.level==0");
        require(sessionId > 0, "single token.session id==0");
        require(stakeAmount[offset] > 0, "single token.stake amount==0");
        require(stakePeriod[offset] > 0, "single token.stake period==0");
        require(session.totalReward == 0, "challenge to level added before");
        require(startTime > 0 && period > 0, "single token: session time==0");
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

    /// @notice Stake an nft and some token.
    /// For the first time whe user deposits his nft:
    ///     It receives nft id, signature and amount of staking.
    /// If user's nft is in the game, then deposit accepts only
    ///     amount.
    function stake(uint256 sessionId, uint32 challengeId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
    {
        /// General information regarding the Staking token and Earning token
        Category storage challenge = challenges[challengeId];

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        require(sessionChallenge.levelId > 0, "single token: session not exist");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];
        require(!playerChallenge.completed, "challange already completed");

        // Previous Challenge should be completed
        if (sessionChallenge.prevChallengeId > 0) {
            PlayerChallenge storage playerPrevChallenge = playerParams[
                sessionId][sessionChallenge.prevChallengeId][staker];
            require(playerPrevChallenge.completed ||
                isCompleted(sessionChallenge, playerPrevChallenge, now),
                "last challenge not completed");
        }

        uint256 amount;
        uint256 nftId;
        // It does verification that nft id is valid
        (amount, nftId) = decodeStakeData(playerChallenge.nftId, data);

        require(!isCompleted(sessionChallenge, playerChallenge, block.timestamp),
            "time completed");

        updateInterestPerToken(sessionChallenge);

        /// Transfer tokens to the Smartcontract
        /// TODO add stake holding option. The stake holding option earns a passive income
        /// by user provided tokens.
        IERC20 _token = IERC20(challenge.stake);
        require(_token.balanceOf(staker) >= amount, "staker balances insufficient");
        require(_token.transferFrom(staker, address(this), amount),
            "transferFrom staker failed");

        if (nftId != playerChallenge.nftId) {
            IERC721 _nft = IERC721(scape);
            _nft.transferFrom(staker, address(this), nftId);
            playerChallenge.nftId = nftId;
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

        emit Stake(
            staker,
            sessionId,
            challengeId,
            amount,
            sessionChallenge.amount,
            playerChallenge.nftId
        );
    }

    /// @dev it returns amount for stake and nft id.
    /// If user already staked, then return the previous staked token.
    function decodeStakeData(uint256 stakedNftId, bytes memory data)
        internal
        view
        returns(uint256, uint256)
    {
        uint256 amount;

        if (stakedNftId > 0) {
            (amount) = abi.decode(data, (uint256));
            require(amount > 0, "scape nft+token.amount==0");
            return (amount, stakedNftId);
        }

        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256 nftId;

        /// Staking amount
        (amount, v, r, s, nftId) = abi.decode(data, (uint256, uint8, bytes32, bytes32, uint256));
        require(amount > 0 && nftId > 0, "invalid nftId or amount");

        /// Verify the Scape Nft signature.
      	/// @dev message is generated as nftId + amount + nonce
      	bytes32 _messageNoPrefix = keccak256(abi.encodePacked(nftId, amount, nonce));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32",
            _messageNoPrefix));
      	address _recover = ecrecover(_message, v, r, s);
      	require(_recover == owner(),  "verification failed");

        return (amount, nftId);
    }

    /// @notice Unstake an nft and some token.
    /// If Category is burning, then revert.
    /// If Category is not burning, then:
    /// Unstake the nft.
    /// Claim all earned rewards.
    /// Unstake the all tokens.
    /// If the time progress completed, then
    ///     mark as completed.
    /// else
    ///     reset the time progress.
    /// @dev data variable is not used, but its here for following the ZombieFarm architecture.
    function unstake(uint256 sessionId, uint32 challengeId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
    {
        /// General information regarding the Staking token and Earning token
        Category storage challenge = challenges[challengeId];
        require(!challenge.burn, "Can't unstake burning tokens");

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        require(sessionChallenge.levelId > 0, "single token: session not exist");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];
        require(!playerChallenge.completed, "already completed and claimed");
        require(playerChallenge.amount > 0, "stake amount zero");

        updateInterestPerToken(sessionChallenge);

        uint256 totalStake = playerChallenge.amount + playerChallenge.overStakeAmount;
        bool timeCompleted = isCompleted(sessionChallenge, playerChallenge, block.timestamp);

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
    		if (playerChallenge.amount >= sessionChallenge.stakeAmount) {
            _claim(sessionId, challengeId, staker);
            playerChallenge.claimedTime = block.timestamp;
    		}

        IERC20 _token = IERC20(challenge.stake);
        IERC721 _nft = IERC721(scape);

        if (playerChallenge.amount <= sessionChallenge.stakeAmount) {
            sessionChallenge.amount = sessionChallenge.amount - sessionChallenge.stakeAmount;

            updateInterestPerToken(sessionChallenge);
            playerChallenge.counted = false;
        }

        playerChallenge.overStakeAmount = 0;
        playerChallenge.amount = 0;
        // Reset the time progress
        playerChallenge.stakedTime = now;
        playerChallenge.stakedDuration = 0;

        /// Transfer tokens to the Smartcontract
        /// TODO add stake holding option. The stake holding option earns a passive income
        /// by user provided tokens.
        require(_token.balanceOf(address(this)) >= totalStake,
            "insufficient contract balances");
        require(_token.transfer(staker, totalStake),
            "transfer to staker failed");

        _nft.transferFrom(address(this), staker, playerChallenge.nftId);

       	emit Unstake(staker, sessionId, challengeId, totalStake, sessionChallenge.amount, 0);

        if (timeCompleted) {
            playerChallenge.completed = true;
        }
    }

    /// @notice CLAIMING:
    /// Claim all earned tokens.
    /// If time progress completed, then
    ///     Withdraw all staked tokens.
    ///     If Category is burning, then
    ///         Burn nft.
    ///     else
    ///         Transfer back to user.
    ///     Mark as completed.
    function claim(uint256 sessionId, uint32 challengeId, address staker)
        external
        override
        onlyZombieFarm
    {
        /// General information regarding the Staking token and Earning token
        Category storage challenge = challenges[challengeId];

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        require(sessionChallenge.levelId > 0, "single token: session not exist");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];
        require(!playerChallenge.completed, "already completed and claimed");
        require(playerChallenge.amount > 0, "stake amount zero");

        updateInterestPerToken(sessionChallenge);

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
    		if (playerChallenge.amount >= sessionChallenge.stakeAmount) {
    		    _claim(sessionId, challengeId, staker);
            playerChallenge.claimedTime = block.timestamp;
    		}

        if (playerChallenge.amount >= sessionChallenge.stakeAmount &&
            isCompleted(sessionChallenge, playerChallenge, block.timestamp)) {

    	    	IERC721 _nft = IERC721(scape);
        		IERC20 _token = IERC20(challenge.stake);

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

            if (challenge.burn) {
                _nft.transferFrom(address(this), address(0), playerChallenge.nftId);
            }

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
                    time = time + (duration * ((playerChallenge.
                        overStakeAmount * sessionChallenge.multiplier) / multiply) / scaler);
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

    function _claim(uint256 sessionId, uint32 challengeId, address staker)
        internal
        returns(bool)
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];

        require(playerChallenge.amount > 0, "didnt deposit enough");

        uint256 interest = calculateInterest(sessionId, challengeId, staker);
        if (interest == 0) {
            return false;
        }

        Category storage challenge = challenges[challengeId];

        IERC20 _token = IERC20(challenge.earn);

        uint256 contractBalance = _token.balanceOf(pool);

        if (interest > 0 && contractBalance < interest) {
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
            _token.transferFrom(pool, staker, contractBalance);
        } else {
            _token.transferFrom(pool, staker, interest);
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

        uint256 claimedPerToken = sessionChallenge
            .claimedPerToken + ((sessionCap - sessionChallenge
            .lastInterestUpdate) * sessionChallenge.interestPerToken);

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
}
