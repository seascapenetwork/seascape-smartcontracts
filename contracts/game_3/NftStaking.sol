pragma solidity 0.6.7;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../seascape_nft/NftFactory.sol";
import "./../seascape_nft/SeascapeNft.sol";

/// @title Seascape NFT staking contract.
/// @author Medet Ahmetson <admin@blocklords.io>
/// @notice Nft Staking contract allows users to earn CWS token by staking NFTs.
/// Nfts will have a Seascape point. Which is the weight of token
/// in Seascape Network platform. The Seascape Point is calculated by Nft parameters
/// such as generation and quality.
/// The higher the NFT weight, the more user gets reward for NFT staking.
contract NftStaking is Ownable, IERC721Receiver {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    uint256 scaler = 10**18;

    NftFactory nftFactory;

    IERC20 private crowns;
    SeascapeNft private nft;

    Counters.Counter private sessionId;

    /// @dev Total amount of Crowns stored for all sessions
    uint256 rewardSupply = 0;

    /// @notice game event struct. as event is a solidity keyword, we call them session instead.
    struct Session {
        uint256 totalReward;   // amount of CWS to give as a reward during the session.
        uint256 period;        // session duration in seconds
        uint256 startTime;     // session start in unixtimestamp
        uint256 claimed;       // amount of distributed reward
        uint256 totalSp;       // amount of seascape points of all NFTs deposited to the session by users
    	  uint256 rewardUnit;  // reward per second = totalReward/period
    }

    /// @notice balance of lp token that each player deposited to game session
    struct Balance {
        uint256 claimedTime;       // amount of claimed CWS reward
    	  uint256 nftId;
    	  uint256 sp;                // seascape points
    }

    /// @dev keep track of the current session
    uint256 public lastSessionId;
    mapping(uint256 => Session) public sessions;
    mapping(uint256 => mapping(address => uint256)) public slots;
    mapping(uint256 => mapping(address => Balance[3])) public balances;
    mapping(uint256 => mapping(address => uint)) public depositTimes;
    mapping(uint256 => mapping(address => uint256)) public earning;

    event SessionStarted(uint256 sessionIdd, uint256 reward, uint256 startTime, uint256 endTime);
    event Deposited(address indexed owner, uint256 sessionId, uint256 nftId, uint256 slotId);
    event Claimed(address indexed owner, uint256 sessionId, uint256 amount, uint256 nftId);


    /// @dev instantinate contracts, start session
    constructor(address _crowns, address _nftFactory, address _nft) public {
        crowns = IERC20(_crowns);
        sessionId.increment(); 	// starts at value 1
        nftFactory = NftFactory(_nftFactory);
        nft = SeascapeNft(_nft);
    }

    //--------------------------------------------------
    // External methods
    //--------------------------------------------------

    /// @dev encrypt token data
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

    /// @notice Starts a staking session for a finite _period of
    /// time, starting from _startTime. The _totalReward of
    /// CWS tokens will be distributed in every second.
    function startSession(
        uint256 _totalReward,
        uint256 _period,
        uint256 _startTime,
        uint256 _generation
    )
        external
        onlyOwner
    {
        require(_startTime > block.timestamp,
            "Seascape Staking: Seassion should start in the future");
        require(_period > 0,
            "Seascape Staking: Session duration should be greater than 0");
    	  require(_totalReward > 0,
            "Seascape Staking: Reward amount should be greater than 0");

      	if (lastSessionId > 0) {
      	    require(isStartedFor(lastSessionId)==false,
                "Seascape Staking: Can't start when session is active");
      	}

      	/// @dev required CWS balance of this contract
      	uint256 newSupply = rewardSupply.add(_totalReward);
      	require(crowns.balanceOf(address(this)) >= newSupply,
            "Seascape Staking: Not enough balance of Crowns for reward");

      	//--------------------------------------------------------------------
      	// creating the session
      	//--------------------------------------------------------------------
      	uint256 _sessionId = sessionId.current();
      	uint256 _rewardUnit = _totalReward.div(_period);
      	sessions[_sessionId] = Session(_totalReward, _period, _startTime, 0, 0, _rewardUnit);

      	//--------------------------------------------------------------------
        // updating rest of session related data
      	//--------------------------------------------------------------------
      	sessionId.increment();
      	rewardSupply = newSupply;
      	lastSessionId = _sessionId;

      	emit SessionStarted(_sessionId, _totalReward, _startTime, _startTime + _period);
    }

    /// @dev sets an nft factory, a smartcontract that mints tokens.
    /// the nft factory should give a permission on it's own side to this contract too.
    function setNftFactory(address _address) external onlyOwner {
        nftFactory = NftFactory(_address);
    }

    /// @notice deposits nft to stake along with it's SP
    function deposit(
        uint256 _sessionId,
	uint8 _index,
        uint256 _nftId,
        uint256 _sp,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        external
    {
	require(_index >= 0 && _index <= 2, "Nft Staking: Slot index is invalid");
	require(_nftId > 0, "Nft Staking: Nft id must be greater than 0");
	require(_sp > 0, "Nft Staking: Seascape Points must be greater than 0");
	require(_sessionId > 0, "Nft Staking: Session id should be greater than 0!");
	require(isStartedFor(_sessionId), "Nft Staking: Session is not active");
	require(nft.ownerOf(_nftId) == msg.sender, "Nft Staking: Nft is not owned by method caller");
	require(balances[_sessionId][msg.sender][_index].nftId == 0, "Nft Staking: slot is used already");

      	/// Verify the Seascape Points signature.
      	/// @dev message is generated as owner + amount + last time stamp + quality
      	bytes32 _messageNoPrefix = keccak256(abi.encodePacked(_nftId, _sp));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32",
            _messageNoPrefix));
      	address _recover = ecrecover(_message, _v, _r, _s);
      	require(_recover == owner(),  "Nft Staking: Seascape points verification failed");

	
      	nft.safeTransferFrom(msg.sender, address(this), _nftId);

	
      	Session storage _session  = sessions[_sessionId];
      	Balance[3] storage _balances  = balances[_sessionId][msg.sender];

        _balances[_index] = Balance(block.timestamp, _nftId, _sp);

      	_session.totalSp = _session.totalSp.add(_sp);
      	depositTimes[_sessionId][msg.sender] = block.timestamp;
      	slots[_sessionId][msg.sender] = slots[_sessionId][msg.sender].add(1);

        emit Deposited(msg.sender, _sessionId, _nftId, _index + 1);
    }

    /// @notice Claim earned CWS tokens
    /// of type _token out of Staking contract.
    function claim(uint256 _sessionId, uint256 _index) external {
        require(_index >= 0 && _index <= 2, "Nft Staking: slot index is invalid");
        require(balances[_sessionId][msg.sender][_index].nftId > 0, "Nft Staking: Slot at index is empty");

      	Balance storage _balance = balances[_sessionId][msg.sender][_index];
      	uint256 _nftId = _balance.nftId;
      	nft.burn(_nftId);

	uint256 _claimed = transfer(_sessionId, _index);
	
        if(earning[_sessionId][msg.sender] > 0){
            earning[_sessionId][msg.sender] = earning[_sessionId][msg.sender].add(_claimed);
        } else{
            earning[_sessionId][msg.sender] = _claimed;
        }

      	sessions[_sessionId].totalSp = sessions[_sessionId].totalSp.sub(_balance.sp);
      	slots[_sessionId][msg.sender] = slots[_sessionId][msg.sender].sub(1);

      	delete balances[_sessionId][msg.sender][_index];

      	emit Claimed(msg.sender, _sessionId, _claimed, _nftId);
    }

    /// @dev Claim all crowns for staked nfts.
    /// Nfts are burned in the process.
    /// Give bonus if all slots are full.
    function claimAll(
        uint256 _sessionId,
        uint256 _bonusPercent,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        external
    {
	require(slots[_sessionId][msg.sender] > 0, "Nft Staking: all slots are empty");

      	/// @dev Check if all three slots are full
        /// and signature is verified, then we will process bonus
      	if (slots[_sessionId][msg.sender] == 3 && _bonusPercent > 0) {
      	    require(verifyBonus(_sessionId, _bonusPercent, _v, _r, _s) == true,
                "NFT Staking: bonus signature is invalid");
            require(giveBonus(_sessionId, _bonusPercent) == true,
                "NFT Staking: failed to transfer bonus to player");
      	}

	claimAll(_sessionId);
    }

    function claimAll(uint256 _sessionId) public {
	require(slots[_sessionId][msg.sender] > 0, "Nft Staking: all slots are empty");

      	for (uint _index=0; _index < slots[_sessionId][msg.sender]; _index++) {
            uint256 _claimed = transfer(_sessionId, _index);

      	    Balance storage _balance = balances[_sessionId][msg.sender][_index];

      	    uint256 _nftId = _balance.nftId;
	    uint256 _sp = _balance.sp;

      	    nft.burn(_nftId);
      	    delete balances[_sessionId][msg.sender][_index];
	    
      	    sessions[_sessionId].totalSp = sessions[_sessionId].totalSp.sub(_sp);

      	    emit Claimed(msg.sender, _sessionId, _claimed, _nftId);
      	}

  	slots[_sessionId][msg.sender] = 0;
    }


    /// @notice Returns amount of CWS Tokens that _address could claim.
    function claimable(uint256 _sessionId, address _owner, uint256 _index)
        external
        view
        returns(uint256)
    {
	      return calculateInterest(_sessionId, _owner, _index);
    }

    /// @notice Returns total amount of Staked LP Tokens
    function stakedBalance(uint256 _sessionId) external view returns(uint256) {
	      return sessions[_sessionId].totalSp;
    }

    //---------------------------------------------------
    // Internal methods
    //---------------------------------------------------

    /// @dev verify bonus signature
    /// @notice Returns true if signature is valid
    function verifyBonus(
        uint256 _sessionId,
        uint256 _bonusPercent,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        internal
        returns(bool)
    {

	Balance[3] storage _balance = balances[_sessionId][msg.sender];

	require(_balance[0].nftId > 0, "NFT Staking: first slot is empty for bonus");
	require(_balance[1].nftId > 0, "NFT Staking: first slot is empty for bonus");		
	require(_balance[2].nftId > 0, "NFT Staking: first slot is empty for bonus");
			
        /// @dev 2. a message from bonus +nft slot 1, slot 2, slot 3
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
            _bonusPercent,
            _balance[0].nftId,
            _balance[1].nftId,
            _balance[2].nftId
        ));

        /// Validation of bonus
	/// @dev 3. verify that signature for message was signed by contract owner
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	address _recover = ecrecover(_message, _v, _r, _s);
      	require(_recover == owner(), "NFT Staking: Seascape points verification failed");

        return true;
    }

    /// @dev calculate total bonus in crowns and send it to player
    /// @notice Returns true if bonus transaction was successful
    function giveBonus(uint256 _sessionId, uint256 _bonusPercent) internal returns(bool) {
	uint256 _interests = 0;
	
        for(uint _index = 0; _index < 3; _index++){
	    _interests = _interests.add(calculateInterest(_sessionId, msg.sender, _index));
        }

	uint256 totalBonus = _interests.mul(scaler)	       
                .div(100).mul(_bonusPercent).div(scaler);

        return crowns.transfer(msg.sender, totalBonus);
    }

    /// @dev earned CWS tokens are sent to Nft staker
    function transfer(uint256 _sessionId, uint256 _index) internal returns(uint256) {
        Session storage _session = sessions[_sessionId];
        Balance storage _balance = balances[_sessionId][msg.sender][_index];

        uint256 _interest = calculateInterest(_sessionId, msg.sender, _index);

        require(crowns.transfer(msg.sender, _interest) == true,
            "Seascape Staking: Failed to transfer reward CWS token");

        _session.claimed = _session.claimed.add(_interest);
        rewardSupply = rewardSupply.sub(_interest);

        return _interest;
    }

    /// @dev Calculate interest amount in crowns for individual slot
    /// @notice Returns interest amount (in number)
    function calculateInterest(uint256 _sessionId, address _owner, uint256 _index)
        internal
        view
        returns(uint256)
    {
	      Session storage _session = sessions[_sessionId];
	      Balance storage _balance = balances[_sessionId][_owner][_index];

	      /// @dev  How much of total deposit belongs to player as a floating number
	      uint256 _sessionCap = block.timestamp;
	      if (isStartedFor(_sessionId) == false) {
	          _sessionCap = _session.startTime.add(_session.period);
	      }

	      uint256 _portion = _balance.sp.mul(scaler).div(_session.totalSp);

       	uint256 _interest = _session.rewardUnit.mul(_portion).div(scaler);

	      /// @notice  _balance.startTime is misleading.
	      /// Because, it's updated in every deposit time or claim time.
	      uint256 _earnPeriod = _sessionCap.sub(_balance.claimedTime);

	      return _interest.mul(_earnPeriod);
    }

    /// @notice Returns true if session is active
    function isStartedFor(uint256 _sessionId) internal view returns(bool) {
	      if (sessions[_sessionId].totalReward == 0) {
	          return false;
	      }

	      if (now > sessions[_sessionId].startTime + sessions[_sessionId].period) {
	          return false;
	      }

	      return true;
    }

}
