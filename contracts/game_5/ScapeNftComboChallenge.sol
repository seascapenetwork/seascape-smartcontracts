pragma solidity 0.6.7;

import "./ZombieFarmChallengeInterface.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";


/// @notice Stake a single scape NFT, and earn ERC20 token
///
/// STAKING:
/// First time whe user deposits his nft:
///     It receives nft id, signature.
/// If user's nft is in the game, then deposit is unavailable.
abstract contract ScapeNftComboChallenge is ZombieFarmChallengeInterface, Ownable {
    using SafeMath for uint256;
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
        address earn;
        uint8 nftAmount;        // How any scapes in the combo
        uint256[5] imgId;       // Image ids for determining image category
        int8[5] generation;     // Generation (-1 if not filtered)
        uint8[5] quality;       // Quality (0 if not filtered)
    }

    struct SessionChallenge {
        uint8 levelId;
        uint32 prevChallengeId;    // This is the previous challenge id if level is

        uint256 totalReward;
        uint256 stakePeriod;        // Duration after which challenge considered to be completed.
        uint256 multiplier;         // Increase the progress

        uint256 amount;             // Total weight of staked nfts.
        uint256 startTime;     		// session start in unixtimestamp
        uint256 endTime;

		    uint256 claimed;       		// amount of already claimed CWS

        uint256 rewardUnit;    		// reward per second = totalReward/period
		    uint256 interestPerToken; 	// total earned interest per token since the beginning
									// of the session
		    uint256 claimedPerToken;    // total amount of tokens earned by a one staked token,
									// since the beginning of the session
		uint256 lastInterestUpdate; // last time when claimedPerToken and interestPerToken
    }

    struct PlayerChallenge {
        uint256 stakedTime;

        uint256[5] weight;             // Weight of the NFT which determines how much it earns

        bool counted;               // true if stake amount is added to total season amount

        uint256 claimed;
		    uint256 claimedTime;
		    uint256 claimedReward;

		    uint256 unpaidReward;       // Amount of token that contract should pay to user

        bool completed;             // true if challenge in the season completed by the player

        uint256[5] nftId;              // Nft that user staked in.
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
        uint256[5] nftId
    );
    event Unstake(
        address indexed staker,
        uint256 indexed sessionId,
        uint32 challengeId,
        uint256 nftId
    );
    event Claim(
        address indexed staker,
        uint256 indexed sessionId,
        uint32 challengeId,
        uint256 amount
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
    /// Each Challenge of this category is different based on their earning, staking or scape nft parameter.
    function newChallenge(uint32 id, bytes calldata data) external override onlyZombieFarm {
        require(challenges[id].earn == address(0), "single token challenge exists");

        address _earn;

        uint8 _nftAmount;      // The supported nft category (0 if not filtered)
        uint256[5] memory _imgId;       // Image ids for determining image category
        int8[5] memory _generation;        // Generation (-1 if not filtered)
        uint8[5] memory _quality;          // Quality (0 if not filtered)

        (_earn, _nftAmount, _imgId, _generation, _quality) =
            abi.decode(data, (address, uint8, uint256[5], int8[5], uint8[5]));

        require(_earn != address(0), "data.earn verification failed");
        require(_nftAmount > 0 && _nftAmount <= 5, "nft amount should range 1-5");
        for (uint8 i = 0; i < _nftAmount; i++) {
            require(_quality[i] <= 5, "data.quality should be under 6 ");
            //require(_imgIdAmount[i] <= 5, "data.imgAmount");
            require(_generation[i] >= -1, "data.gen should be above -1");
        }

        challenges[id] = Category(_earn, _nftAmount, _imgId, _generation, _quality);
    }

    /// @notice The challenges of this category were added to the Zombie Farm season
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
        uint32[5] memory id;                    // Challenge Id
        uint8[5] memory levelId;                // Level of Zombie Farm to which challenge was added
        uint32[5] memory prevChallengeId;       // Previous Level Challenge that player should complete
        uint256[5] memory reward;               // Reward pool that players are farming
        uint256[5] memory stakePeriod;          // Staking period
        // multipliers could be 0.
        uint256[5] memory multiplier;           // The time progress speed if the player stakes more

        (id, levelId, reward, stakePeriod, multiplier, prevChallengeId) =
            abi.decode(data, (uint32[5], uint8[5], uint256[5], uint256[5], uint256[5], uint32[5]));

        SessionChallenge storage session = sessionChallenges[sessionId][id[offset]];

        // Challenge.stake is not null, means that Challenge.earn is not null too.
        require(challenges[id[offset]].earn != address(0),
            "single token.challenge no exist");
        require(reward[offset] > 0, "single token.reward==0");
        require(levelId[offset] > 0, "single token.level==0");
        require(sessionId > 0, "single token.session id==0");
        require(stakePeriod[offset] > 0, "single token.stake period==0");
        require(session.totalReward == 0, "challenge to level added before");
        require(startTime > 0 && period > 0, "single token: session time==0");
        if (prevChallengeId[offset] > 0) {
            require(challenges[prevChallengeId[offset]].earn != address(0),
                "previous challenge incomplete");
        }

        session.levelId = levelId[offset];
        session.totalReward = reward[offset];
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
    function stake(uint256 sessionId, uint32 challengeId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
    {
        /// General information regarding the Staking token and Earning token
        Category storage challenge = challenges[challengeId];

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        require(sessionChallenge.levelId > 0, "combo token: session !exists");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];
        require(!playerChallenge.completed, "challange already completed");

        require(playerChallenge.nftId[0] == 0, "already staked");

        // Previous Challenge should be completed
        if (sessionChallenge.prevChallengeId > 0) {
            PlayerChallenge storage playerPrevChallenge =
                playerParams[sessionId][sessionChallenge.prevChallengeId][staker];
            require(playerPrevChallenge.completed ||
                isCompleted(sessionChallenge, playerPrevChallenge, now),
                "last challenge not completed");
        }

        uint256[5] memory nftId;
        uint256[5] memory weight;
        // It does verification that nft id is valid
        (nftId, weight) = decodeStakeData(
            challenge.nftAmount, playerChallenge.nftId, playerChallenge.weight, data);

        IERC721 _nft = IERC721(scape);
        for (uint8 i = 0; i < challenge.nftAmount; i++) {
            require(_nft.ownerOf(nftId[i]) == staker, "not your nft");
        }

        require(!isCompleted(sessionChallenge, playerChallenge, block.timestamp),
          "time completed");

        updateInterestPerToken(sessionChallenge);

        for (uint8 i = 0; i < challenge.nftAmount; i++) {
            _nft.transferFrom(staker, address(this), nftId[i]);
            playerChallenge.nftId[i] = nftId[i];
            playerChallenge.weight[i] = weight[i];
        }

        for (uint8 i = 0; i < challenge.nftAmount; i++) {
            sessionChallenge.amount = sessionChallenge.amount.add(weight[i]);
        }

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
        playerChallenge.claimedTime = block.timestamp;
        playerChallenge.stakedTime = block.timestamp;

        updateTimeProgress(sessionChallenge, playerChallenge);

   		  updateBalanceInterestPerToken(challenge
            .nftAmount, sessionChallenge.claimedPerToken, playerChallenge);

		    emit Stake(staker, sessionId, challengeId, nftId);
    }

    /// @dev it returns amount for stake and nft id.
    /// If user already staked, then return the previous staked token.
    function decodeStakeData(
        uint8 nftAmount,
        uint256[5] memory stakedNftId,
        uint256[5] memory stakedWeight,
        bytes memory data
    )
        internal
        view
        returns (uint256[5] memory, uint256[5] memory)
        {
        if (stakedNftId[0] > 0) {
            return (stakedNftId, stakedWeight);
        }

        uint8 v;
        bytes32 r;
        bytes32 s;
        uint256[5] memory nftId;
        uint256[5] memory weight;

        /// Staking amount
        (v, r, s, nftId, weight) = abi.decode(
            data, (uint8, bytes32, bytes32, uint256[5], uint256[5]));
        for(uint8 i = 0; i < nftAmount; i++) {
            require(nftId[i] > 0, "scape nft null params");
            require(weight[i] > 0, "weight is 0");
        }

        /// Verify the Scape Nft signature.
      	/// @dev message is generated as nftId + amount + nonce
      	bytes32 _messageNoPrefix = keccak256(abi.encodePacked(nftId, weight, nonce));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32",
            _messageNoPrefix));
      	address _recover = ecrecover(_message, v, r, s);
      	require(_recover == owner(),  "scape nft+token.nftId, token.weight");

        return (nftId, weight);
    }

    /// @notice Unstake an nft and some token.
    function unstake(
        uint256 sessionId,
        uint32 challengeId,
        address staker,
        bytes calldata data
    )
        external
        override
        onlyZombieFarm
    {
        revert();
    }

    /// @notice CLAIMING:
    /// Claim all earned tokens.
    /// If time progress completed, then
    ///     Withdraw all staked tokens.
    ///     Mark as completed.
    function claim(uint256 sessionId, uint32 challengeId, address staker)
        external
        override
        onlyZombieFarm
    {
        /// General information regarding the Staking token and Earning token
        Category storage challenge = challenges[challengeId];
        uint256 claimedAmount;

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        require(sessionChallenge.levelId > 0, "single token:no exist session");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];
        require(!playerChallenge.completed, "already completed and claimed");
        //check each individual nftid
        for(uint8 i = 0; i < challenge.nftAmount; i++){
            require(playerChallenge.nftId[i] > 0, "stake amount zero");
        }

        updateInterestPerToken(sessionChallenge);

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
    	  _claim(sessionId, challengeId, staker);
        playerChallenge.claimedTime = block.timestamp;

        if (isCompleted(sessionChallenge, playerChallenge, block.timestamp)) {
	    	    IERC721 _nft = IERC721(scape);

            playerChallenge.stakedTime = 0;
            playerChallenge.completed = true;

            for (uint8 i = 0; i < challenge.nftAmount; i++) {
                _nft.transferFrom(address(this), staker, playerChallenge.nftId[i]);
                playerChallenge.nftId[i] = 0;
                sessionChallenge.amount = sessionChallenge.amount.sub(playerChallenge.weight[i]);
                claimedAmount += playerChallenge.weight[i];
                playerChallenge.weight[i] = 0;
            }
            updateInterestPerToken(sessionChallenge);
        }

   		emit Claim(staker, sessionId, challengeId, claimedAmount);
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
        if (playerChallenge.stakedTime > 0) {
            uint256 duration = (currentTime - playerChallenge.stakedTime);
            return duration >= sessionChallenge.stakePeriod;
        }

        return false;
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
        if (isCompleted(sessionChallenge, playerChallenge, now)) {
            playerChallenge.completed = true;
        }
    }

    function updateBalanceInterestPerToken(
        uint8 nftAmount,
        uint256 claimedPerToken,
        PlayerChallenge storage playerChallenge
    )
        internal
        returns(bool)
    {
  		for (uint8 i = 0; i < nftAmount; i++) {
              playerChallenge.claimedReward = claimedPerToken * playerChallenge
                  .weight[i] / scaler; // 0
          }
      }

    function _claim(uint256 sessionId, uint32 challengeId, address staker)
        internal
        returns(bool)
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];

		    require(playerChallenge.weight[0] > 0, "no deposit");

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

    function calculateInterest(uint256 sessionId, uint32 challengeId, address staker)
        internal
        view
        returns(uint256)
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId][challengeId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][challengeId][staker];

    		// How much of total deposit belongs to player as a floating number
    		/* if (playerChallenge.weight[staker] == 0 || sessionChallenge.amount == 0) {
    			return 0;
    		} */

    		uint256 sessionCap = block.timestamp;
    		if (isActive(sessionChallenge.startTime, sessionChallenge.endTime) == false) {
    			  sessionCap = sessionChallenge.endTime;

    			// claimed after session expire, means no any claimables
    			  if (playerChallenge.claimedTime >= sessionCap) {
    				    return 0;
    			  }
    		}

    		uint256 claimedPerToken = sessionChallenge.claimedPerToken + ((sessionCap - sessionChallenge
            .lastInterestUpdate) * sessionChallenge.interestPerToken);

    		// (balance * total claimable) - user deposit earned amount per token - balance.claimedTime
        uint256 interest = (claimedPerToken / scaler) - playerChallenge.claimedReward;

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
        uint256[5] memory stakePeriod;
        uint256[5] memory multiplier;
        uint32[5] memory prevChallengeId;

        (id, levelId, reward, stakePeriod, multiplier, prevChallengeId) = abi
            .decode(data, (uint32[5], uint8[5], uint256[5], uint256[5], uint256[5], uint32[5]));

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
