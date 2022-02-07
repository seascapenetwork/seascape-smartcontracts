pragma solidity 0.6.7;

import "./../../defi/StakeToken.sol";
import "./../../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../interfaces/ZombieFarmChallengeInterface.sol";
import "./../interfaces/ZombieFarmInterface.sol";
import "./../../openzeppelin/contracts/access/Ownable.sol";
import "./../helpers/VaultHandler.sol";
import "./../../openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Stake one token and nft, 
/// and earn another token.
/// The staked token requires a certain nft.
///
/// @dev WARNING! WARNING! WARNING
/// It only supports tokens with 18 decimals.
/// Otherwise you need to edit the `scaler`
contract NftTokenChallenge is ZombieFarmChallengeInterface, ReentrancyGuard, VaultHandler, Ownable, IERC721Receiver  {
    using SafeERC20 for IERC20;

    address public zombieFarm;
    address payable public stakeHandler;

    uint public constant scaler = 10**18;
    uint public constant multiply = 10000000; // The multiplier placement supports 0.00000001

    address public nft;             
    address public stakeToken;
    address public rewardToken;

    struct SessionChallenge {
        bool    burn;
        uint8   levelId;
        uint stakeAmount;        // Required amount to pass the level
        uint stakePeriod;        // Duration after which challenge considered to be completed.
        uint multiplier;         // Increase the progress
    }

    struct PlayerChallenge {
        uint stakedTime;
        uint stakedDuration;

        uint amount;        		// amount of deposited token
        bool addedToPool;               // whether its been addedToPool in the session or not.
        bool completed;             // Was the challenge in the season completed by the player or not.
        uint nftId;
    }

    mapping(uint => SessionChallenge) public sessionChallenges;
    // session id => player address = PlayerChallenge
    mapping(uint => mapping (address => PlayerChallenge)) public playerParams;

    modifier onlyZombieFarm () {
	    require(msg.sender == zombieFarm, "only ZombieFarm can call");
	    _;
    }

    // Amount - is the users staked amount.
    // sessionAmount - is the total token amount.
    event Stake(
        address indexed staker,
        uint indexed sessionId,
        uint indexed levelId,
        uint amount,
        uint nftId
    );

    // amount is the user amount
    // sessionAmount - is the remaining total pool.
    event Unstake(
        address indexed staker,
        uint indexed sessionId,
        uint8   indexed levelId,
        uint amount,
        uint nftId
    );

    // amount total amount of tokens user claimed.
    event Claim(
        address indexed staker,
        uint indexed sessionId,
        uint8   indexed levelId,
        uint amount
    );

    constructor (address _zombieFarm, address _vault, address _nft, address _stake, address _reward, address payable _stakeHandler) VaultHandler(_vault) public {
        require(_zombieFarm != address(0), "invalid _zombieFarm address");
        require(_nft      != address(0), "data.stake verification failed");

        if (_reward != address(0)) {
            require(IERC20(_reward).decimals() == 18, "DECIMAL_WEI");
        }
        if (_stake != address(0)) {
            require(IERC20(_stake).decimals() == 18, "DECIMAL_WEI");
        }

        zombieFarm          = _zombieFarm;
        stakeToken          = _stake;
        nft                 = _nft;
        rewardToken         = _reward;
        stakeHandler        = _stakeHandler;
        
        initReentrancyStatus();
    }

    function getStakeAmount(bytes calldata data) external override view returns (uint256) {
        /// Staking amount
        (, , , , uint amount) 
            = abi.decode(data, (uint8, bytes32, bytes32, uint, uint));
        require(amount > 0, "amount is 0");

        return amount;
    }

    function getUnstakeAmount(bytes calldata data) external override view returns (uint256) {
        /// Staking amount
        (, , , , uint amount) 
            = abi.decode(data, (uint8, bytes32, bytes32, uint, uint));
        require(amount > 0, "amount is 0");

        return amount;
    }

    /// @notice a new challenge of this challenge category was added to the session.
    /// @dev We are not validating most of the parameters, since we trust to the Owner.
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

        (uint[4] memory uints, uint8 burn) = abi.decode(data, (uint[4], uint8));
        for (uint8 i = 0; i < 4; i++) {
            require(uints[i] > 0, "zero_value");
        }

        // Challenge.stake is not null, means that earn is not null too.
        SessionChallenge storage session = sessionChallenges[sessionId];
        session.levelId             = levelId;
        session.stakeAmount         = uints[1];
        session.stakePeriod         = uints[2];
        session.multiplier          = uints[3];
        if (burn == 1) {
            session.burn = true;
        }

        ZombieFarmInterface zombie  = ZombieFarmInterface(zombieFarm);
        (uint startTime,uint period,,,,) = zombie.sessions(sessionId);
        require(startTime > 0, "no session on zombie farm");

        StakeToken handler = StakeToken(stakeHandler);
        handler.newPeriod(sessionId, stakeToken, rewardToken, startTime, startTime + period, uints[0]);
    }

    /// @dev The ZombieFarm calls this function when the session is active only.
    /// This function is not callable if time progress reached to the max level.
    function stake(uint sessionId, address staker, bytes calldata data)
        external
        override
        onlyZombieFarm
        nonReentrant
    {
        SessionChallenge storage sessionChallenge = sessionChallenges[sessionId];
        require(sessionChallenge.levelId > 0, "session does not exist");

        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        // if full completed, then user withdrew everything completely.
        // if time completed, then user can only unstake his tokens.
        require(!playerChallenge.completed &&
            !isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp), "time completed");

        uint amount;
        uint nftId;
        /// Staking amount
       (nftId, amount) = decodeStakeData(sessionId, data);

        uint total = amount + playerChallenge.amount;
        require(total >= sessionChallenge.stakeAmount, "invalid stake amount");


        // Amount holds only max session.stakeAmount
        // the remaining part goes to multiply
        if (!playerChallenge.addedToPool) {
            playerChallenge.addedToPool = true;

            IERC721 _nft = IERC721(nft);
            require(_nft.ownerOf(nftId) == staker, "not owned by user!");

            StakeToken handler = StakeToken(stakeHandler);
            handler.stake(sessionId, staker, sessionChallenge.stakeAmount);

            if (total - sessionChallenge.stakeAmount > 0) { 
                transferFromUserToVault(stakeToken, total - sessionChallenge.stakeAmount, staker);
            }

            _nft.safeTransferFrom(staker, address(this), nftId);
            
            playerChallenge.stakedTime = block.timestamp;
            playerChallenge.nftId = nftId;
        }else {
            transferFromUserToVault(stakeToken, amount, staker);
        }

        // Amount holds only max session.stakeAmount
        // the remaining part goes to multiply
        playerChallenge.amount = total;

		emit Stake(staker, sessionId, sessionChallenge.levelId, amount, nftId);
    }

    /// @notice Unstaking is not possible until the end of time
    function unstake(uint sessionId, address staker, bytes calldata data)
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

        bool timeCompleted = isTimeCompleted(sessionChallenge, playerChallenge, block.timestamp);
        require(!playerChallenge.completed && timeCompleted, "not completed yet");

        StakeToken handler = StakeToken(stakeHandler);

        // Unstaking before time progress resets the time progress.
        //
        // Unstaking after time progress withdraws all tokens and marks 
        // this challenge as completed.
        // Withdrawing all tokens.
        playerChallenge.completed = true;
            
        handler.unstake(sessionId, staker, sessionChallenge.stakeAmount);
        playerChallenge.addedToPool = false;

        if (playerChallenge.amount > sessionChallenge.stakeAmount) {
            uint keepAmount = playerChallenge.amount - sessionChallenge.stakeAmount;
            transferFromVaultToUser(stakeToken, keepAmount, staker);
        }

        IERC721 _nft = IERC721(nft);
        if (sessionChallenge.burn) {
            _nft.safeTransferFrom(address(this), staker, playerChallenge.nftId);
        } else {
            _nft.safeTransferFrom(address(this), 0x000000000000000000000000000000000000dEaD, playerChallenge.nftId);
        }

        emit Unstake(staker, sessionId, sessionChallenge.levelId, playerChallenge.amount, playerChallenge.nftId);

        playerChallenge.completed = true;
        playerChallenge.nftId = 0;
    }

    /**
     * @dev You can't call this function, if timer is finished.
     */
    function claim(uint sessionId, address staker)
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
    function speedUp(uint sessionId, address staker)
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

    function getLevel(uint sessionId) external override view returns(uint8) {
        return sessionChallenges[sessionId].levelId;
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

        if (playerChallenge.amount < sessionChallenge.stakeAmount) {
            return false;
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

    function isFullyCompleted(uint sessionId, address staker)
        public
        override
        view
        returns(bool)
    {
        PlayerChallenge storage playerChallenge = playerParams[sessionId][staker];

        return playerChallenge.completed;
    }

        /// @dev it returns amount for stake and  id.
    /// If user already staked, then return the previous staked token.
    function decodeStakeData(uint sessionId, bytes memory data)
        internal
        view
        returns(uint, uint)
    {
        /// Staking amount
        (uint8 v, bytes32 r, bytes32 s, uint nftId, uint amount) 
            = abi.decode(data, (uint8, bytes32, bytes32, uint, uint));
        require(nftId > 0, "nft  null params");
        require(amount > 0, "amount is 0");

        /// Verify the nft  signature.
      	/// @dev message is generated as nftId + amount + nonce
      	bytes32 _messageNoPrefix = keccak256(abi.encodePacked(address(this), sessionId, nftId, nft));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32",
            _messageNoPrefix));
      	address _recover = ecrecover(_message, v, r, s);
      	require(_recover == owner(),  "nft +token.nftId, token.amount");

        return (nftId, amount);
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
}
