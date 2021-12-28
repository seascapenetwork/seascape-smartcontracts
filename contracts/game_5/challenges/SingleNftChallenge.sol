pragma solidity 0.6.7;

import "./../../defi/StakeNft.sol";
import "./../interfaces/ZombieFarmChallengeInterface.sol";
import "./../interfaces/ZombieFarmInterface.sol";
import "./../../openzeppelin/contracts/access/Ownable.sol";
import "./../../openzeppelin/contracts/math/SafeMath.sol";
import "./../../openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Stake a single nft , and earn ERC20 token
///
/// STAKING:
/// First time whe user deposits his :
/// It receives  id, signature.
/// If user's  is in the game, then deposit is unavailable.
abstract contract NftChallenge is ZombieFarmChallengeInterface, Ownable, ReentrancyGuard {
    using SafeMath for uint;
    address public stakeHandler;
    address public zombieFarm;

    // The seascape  address
    address public nft;
    address public rewardToken;

    /// @dev The account that keeps all ERC20 rewards
    uint public nonce = 0;

    struct SessionChallenge {
        bool burn;
        uint8 levelId;

        uint stakePeriod;        // Duration after which challenge considered to be completed.
    }

    struct PlayerChallenge {
        uint stakedDuration;
        uint stakedTime;
        bool counted;               // True if the stake amount is added to total season amount

        bool completed;             // True if challenge in the season was completed by the player
        

        uint nftId;              //  that user staked in.
    }

    mapping(uint => SessionChallenge) public sessionChallenges;
    // session id => player address = PlayerChallenge
    mapping(uint => mapping (address => PlayerChallenge)) public playerParams;

    modifier onlyZombieFarm () {
        require(msg.sender == zombieFarm, "only ZombieFarm can call");
        _;
    }

    event Stake(
        address indexed staker,
        uint indexed sessionId,
        uint32 levelId,
        uint nftId
    );

    event Unstake(
        address indexed staker,
        uint indexed sessionId,
        uint32 levelId,
        uint nftId
    );

    event Claim(
        address indexed staker,
        uint indexed sessionId,
        uint32 levelId,
        uint nftId,
        uint amount
    );

    constructor (address _zombieFarm, address _nft, address _reward, address _handler) public {
        require(_zombieFarm != address(0), "invalid _zombieFarm address");
        require(_nft != address(0), "invalid _scape address");

        zombieFarm = _zombieFarm;
        nft = _nft;
        rewardToken = _reward;
        stakeHandler = _handler;
        initReentrancyStatus();
    }

    /// @notice The challenges of this category were added to the Zombie Farm season
    function addChallengeToSession(
        uint sessionId,
        uint8 levelId,
        bytes calldata data
    )
        external
        override
        onlyZombieFarm
    {
        require(sessionChallenges[sessionId].levelId == 0, "already added to the session");

        (uint reward, uint stakePeriod, uint8 burn) 
            = abi.decode(data, (uint, uint, uint8));
        require(reward > 0 && stakePeriod > 0, "zero_value");

        // Challenge.stake is not null, means that earn is not null too.
        SessionChallenge storage session = sessionChallenges[sessionId];
        session.levelId             = levelId;
        session.stakePeriod         = stakePeriod;
        if (burn == 1) {
            session.burn = true;
        } else {
            session.burn = false;
        }

        ZombieFarmInterface zombie  = ZombieFarmInterface(zombieFarm);
        (uint startTime,uint period,,,,) = zombie.sessions(sessionId);
        require(startTime > 0, "no session on zombie farm");

        StakeNft handler = StakeNft(stakeHandler);
        handler.newPeriod(sessionId, nft, rewardToken, startTime, startTime + period, reward);
    }

    /// @notice Stake an  and some token.
    /// For the first time whe user deposits his :
    ///     It receives  id, signature and amount of staking.
    function stake(uint sessionId, address staker, bytes calldata data)
        external
        payable
        override
        onlyZombieFarm
        nonReentrant
    {
        // It does verification that  id is valid
        (uint nftId, uint weight) = decodeStakeData(data);

        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        require(sessionChallenge.levelId > 0, "session does not exist");
        
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        // if full completed, then user withdrew everything completely.
        // if time completed, then user can only unstake his tokens.
        require(!playerChallenge.completed &&
            !isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp), "time completed");

        require(playerChallenge.nftId == 0, "already staked");
        nonce++;

        playerChallenge.nftId   = nftId;
        playerChallenge.stakedTime = block.timestamp;

        StakeNft handler = StakeNft(stakeHandler);
        handler.stake(sessionId, staker, nftId, weight);

		emit Stake(staker, sessionId, sessionChallenge.levelId, nftId);
    }

    /// @notice Unstake nft. If the challenge is burning in this sesion
    /// then burn nft.
    /// @dev data variable is not used, but its here for following the ZombieFarm architecture.
    function unstake(uint sessionId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        require(sessionChallenge.levelId > 0, "session does not exist");

        /// Player parameters
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];
        require(playerChallenge.nftId > 0, "stake amount zero");

        StakeNft handler = StakeNft(stakeHandler);
        handler.claim(sessionId, staker);

        bool timeCompleted = isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp);

        require(timeCompleted, "can only unstake");
        handler.unstake(sessionId, staker, playerChallenge.nftId, sessionChallenge.burn);

        if (timeCompleted && !playerChallenge.completed) {
            playerChallenge.completed = true;
        }

        playerChallenge.nftId = 0;
        playerChallenge.stakedTime = block.timestamp;

        emit Unstake(staker, sessionId, sessionChallenge.levelId, playerChallenge.nftId);
    }

    /// @notice CLAIMING:
    /// you can't call this function is time is completed.
    /// you can't call this function if nft is burning.
    function claim(uint sessionId, address staker)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        require(sessionChallenge.levelId > 0, "session does not exist");
        require(!sessionChallenge.burn, "Can't unstake burning tokens");
        require(!playerChallenge.completed && !isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp), "only withdraw");

        require(playerChallenge.nftId > 0, "stake amount zero");

        StakeNft handler = StakeNft(stakeHandler);
        uint claimed = handler.claim(sessionId, staker);

        emit Claim(staker, sessionId, sessionChallenge.levelId, playerChallenge.nftId, claimed);
    }

    function getLevel(uint sessionId)
        external
        override
        view
        onlyZombieFarm
        returns(uint8)
    {
        return sessionChallenges[sessionId].levelId;
    }

    function isFullyCompleted(uint sessionId, address staker)
        external
        override
        view
        returns(bool)
    {
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        return playerChallenge.completed;
    }

    function isTimeCompleted(uint sessionId, address staker) external override view returns(bool) {
        /// Session Parameters
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        return isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp);
    }

    function isTimeCompleted(
        SessionChallenge storage sessionChallenge,
        PlayerChallenge storage playerChallenge,
        uint currentTime
    )
        internal
        view
        returns(bool)
    {
        if (playerChallenge.stakedDuration >= sessionChallenge.stakePeriod) {
            return true;
        }

        if (playerChallenge.nftId == 0) {
            return false;
        }
            
        uint duration    = (currentTime - playerChallenge.stakedTime);
        uint time        = playerChallenge.stakedDuration + duration;

        return (time >= sessionChallenge.stakePeriod);
    }

    /// @dev it returns amount for stake and  id.
    /// If user already staked, then return the previous staked token.
    function decodeStakeData(bytes memory data)
        internal
        view
        returns(uint, uint)
    {
        /// Staking amount
        (uint8 v, bytes32 r, bytes32 s, uint nftId, uint weight) 
            = abi.decode(data, (uint8, bytes32, bytes32, uint, uint));
        require(nftId > 0, "nft  null params");
        require(weight > 0, "weight is 0");

        /// Verify the nft  signature.
      	/// @dev message is generated as nftId + amount + nonce
      	bytes32 _messageNoPrefix = keccak256(abi.encodePacked(nftId, weight, nft, nonce));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32",
            _messageNoPrefix));
      	address _recover = ecrecover(_message, v, r, s);
      	require(_recover == owner(),  "nft +token.nftId, token.weight");

        return (nftId, weight);
    }

    /// Set session as complete
    function speedUp(uint sessionId, address staker)
        external
        override
        onlyZombieFarm
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        require(playerChallenge.nftId > 0, "no nft");

        playerChallenge.stakedDuration += sessionChallenge.stakePeriod;
    }
}
