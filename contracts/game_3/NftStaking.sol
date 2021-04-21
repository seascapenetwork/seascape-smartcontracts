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

    uint256 constant MULTIPLIER = 10**18;

    NftFactory nftFactory;

    IERC20 private crowns;
    SeascapeNft private nft;

    Counters.Counter private sessionId;

    /// @notice game event struct. as event is a solidity keyword, we call them session instead.
    struct Session {
        uint256 totalReward;   // amount of CWS to give as a reward during the session.
        uint256 period;        // session duration in seconds
        uint256 startTime;     // session start in unixtimestamp
        uint256 claimed;       // amount of distributed reward
        uint256 totalSp;       // amount of seascape points of all NFTs deposited to the session by users
    	uint256 rewardUnit;  // reward per second = totalReward/period
        uint256 interestPerPoint;
        uint256 claimedPerPoint;
        uint256 lastInterestUpdate;
    }

    /// @notice balance of lp token that each player deposited to game session
    struct Balance {
        uint256 claimedTime;       // amount of claimed CWS reward
    	  uint256 nftId;
    	  uint256 sp;                // seascape points
          uint256 claimedAmount;
    }

    mapping(address => uint256) debts;

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
    event BonusClaimed(address indexed owner, uint256 sessionId, uint256 baseAmount, uint256 amountWithBonus, uint256 percents);
    event NftFactorySet(address factory);

    /// @dev instantinate contracts, start session
    constructor(address _crowns, address _nftFactory, address _nft) public {
        require(_crowns != address(0), "Crowns can't be zero address");
        require(_nftFactory != address(0), "Nft Factory can't be zero address");

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
        uint256 _startTime
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
      	    require(!isActive(lastSessionId),
                "Seascape Staking: Can't start when session is active");
      	}

      	/// @dev required CWS balance of this contract
      	require(crowns.balanceOf(address(this)) >= _totalReward,
            "Seascape Staking: Not enough balance of Crowns for reward");
        

      	//--------------------------------------------------------------------
      	// creating the session
      	//--------------------------------------------------------------------
      	uint256 _sessionId = sessionId.current();
      	uint256 _rewardUnit = _totalReward.mul(MULTIPLIER).div(_period);
      	sessions[_sessionId] = Session(_totalReward, _period, _startTime, 0, 0, _rewardUnit, 0, 0, _startTime);

      	//--------------------------------------------------------------------
        // updating rest of session related data
      	//--------------------------------------------------------------------
      	sessionId.increment();
      	lastSessionId = _sessionId;

      	emit SessionStarted(_sessionId, _totalReward, _startTime, _startTime + _period);
    }

    /// @dev sets an nft factory, a smartcontract that mints tokens.
    /// the nft factory should give a permission on it's own side to this contract too.
    function setNftFactory(address _address) external onlyOwner {
        require(_address != address(0), "Nft Factory can't be zero address");
        nftFactory = NftFactory(_address);

        emit NftFactorySet(_address);
    }

    function payDebt(address _address) external onlyOwner {
		uint256 _debt = debts[_address];
        if (_debt > 0) {
			uint256 crownsBalance = crowns.balanceOf(address(this));
			require(crownsBalance >= _debt, "Nft Staking: Not enough Crowns to transfer!");

			crowns.transfer(msg.sender, _debt);
			debts[_address] = 0;
		}
	}

    /// @notice deposits nft to stake along with it's SP
    function deposit(uint256 _sessionId, uint8 _index, uint256 _nftId, uint256 _sp, uint8 _v, bytes32 _r, bytes32 _s) external {
        require(_index <= 2, "Nft Staking: Slot index is invalid");
        require(_nftId > 0, "Nft Staking: Nft id must be greater than 0");
        require(_sp > 0, "Nft Staking: Seascape Points must be greater than 0");
        require(_sessionId > 0, "Nft Staking: Session id should be greater than 0!");
        require(isActive(_sessionId), "Nft Staking: Session is not active");
        require(nft.ownerOf(_nftId) == msg.sender, "Nft Staking: Nft is not owned by method caller");
        require(balances[_sessionId][msg.sender][_index].nftId == 0, "Nft Staking: slot is used already");

        updateInterestPerPoint(_sessionId);

      	/// Verify the Seascape Points signature.
      	/// @dev message is generated as owner + amount + last time stamp + quality
      	bytes32 _messageNoPrefix = keccak256(abi.encodePacked(_nftId, _sp));
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	address _recover = ecrecover(_message, _v, _r, _s);
      	require(_recover == owner(),  "Nft Staking: Seascape points verification failed");

      	nft.safeTransferFrom(msg.sender, address(this), _nftId);
	
      	Session storage _session  = sessions[_sessionId];
      	Balance[3] storage _balances  = balances[_sessionId][msg.sender];

      	_session.totalSp = _session.totalSp.add(_sp);

        // update the interestPerPoint variable of the session
        updateInterestPerPoint(_sessionId);

      	depositTimes[_sessionId][msg.sender] = block.timestamp;
      	slots[_sessionId][msg.sender] = slots[_sessionId][msg.sender].add(1);

        _balances[_index] = Balance(block.timestamp, _nftId, _sp, 0);
		_balances[_index].claimedAmount = _session.claimedPerPoint.mul(_balances[_index].sp).div(MULTIPLIER); // 0

        emit Deposited(msg.sender, _sessionId, _nftId, _index + 1);
    }

    /// @notice Claim earned CWS tokens
    /// of type _token out of Staking contract.
    function claim(uint256 _sessionId, uint256 _index) external {
        require(_index <= 2, "Nft Staking: slot index is invalid");
        require(balances[_sessionId][msg.sender][_index].nftId > 0, "Nft Staking: Slot at index is empty");

        updateInterestPerPoint(_sessionId);

      	Balance storage _balance = balances[_sessionId][msg.sender][_index];
      	uint256 _nftId = _balance.nftId;
      	nft.burn(_nftId);

	    uint256 _claimed = transfer(_sessionId, _index);
	
        earning[_sessionId][msg.sender] = earning[_sessionId][msg.sender].add(_claimed);

      	sessions[_sessionId].totalSp = sessions[_sessionId].totalSp.sub(_balance.sp);
      	slots[_sessionId][msg.sender] = slots[_sessionId][msg.sender].sub(1);

      	delete balances[_sessionId][msg.sender][_index];

        updateInterestPerPoint(_sessionId);

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
      	    require(verifyBonus(_sessionId, _bonusPercent, _v, _r, _s), "NFT Staking: bonus signature is invalid");
            require(giveBonus(_sessionId, _bonusPercent), "NFT Staking: failed to transfer bonus to player");
      	}

	    claimAll(_sessionId);
    }

    function claimAll(uint256 _sessionId) public {
	    require(slots[_sessionId][msg.sender] > 0, "Nft Staking: all slots are empty");

      	for (uint _index=0; _index < slots[_sessionId][msg.sender]; _index++) {
            uint256 _claimed = transfer(_sessionId, _index);

            earning[_sessionId][msg.sender] = earning[_sessionId][msg.sender].add(_claimed);

            updateInterestPerPoint(_sessionId);

      	    Balance storage _balance = balances[_sessionId][msg.sender][_index];

      	    uint256 _nftId = _balance.nftId;
	        uint256 _sp = _balance.sp;

      	    nft.burn(_nftId);
            
      	    delete balances[_sessionId][msg.sender][_index];
	    
      	    sessions[_sessionId].totalSp = sessions[_sessionId].totalSp.sub(_sp);

            updateInterestPerPoint(_sessionId);

      	    emit Claimed(msg.sender, _sessionId, _claimed, _nftId);
      	}

  	    slots[_sessionId][msg.sender] = 0;
    }


    /// @notice Returns amount of CWS Tokens that _address could claim.
    function claimable(uint256 _sessionId, address _address, uint256 _index)
        external
        view
        returns(uint256)
    {
	      return calculateInterest(_sessionId, _address, _index);
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
        view 
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

	    uint256 _totalBonus = _interests.mul(MULTIPLIER).mul(_bonusPercent).div(100).div(MULTIPLIER);
        require(crowns.allowance(owner(), address(this)) >= _totalBonus, "Seascape Staking: Not enough bonus balance");

        bool res = crowns.transferFrom(owner(), msg.sender, _totalBonus);
        if (!res) {
            return false;
        }

        earning[_sessionId][msg.sender] = earning[_sessionId][msg.sender].add(_totalBonus);

        emit BonusClaimed(msg.sender, _sessionId, _interests, _totalBonus, _bonusPercent);

        return true;
    }

    /// @dev earned CWS tokens are sent to Nft staker
    function transfer(uint256 _sessionId, uint256 _index) internal returns(uint256) {
        Session storage _session = sessions[_sessionId];

        uint256 _interest = calculateInterest(_sessionId, msg.sender, _index);

        uint256 _crownsBalance = crowns.balanceOf(address(this));
        if (_interest > 0 && _interest > _crownsBalance) {
            debts[msg.sender] = _interest.sub(_crownsBalance).add(debts[msg.sender]);
            crowns.transfer(msg.sender, _crownsBalance);
        } else {
            crowns.transfer(msg.sender, _interest);
        }

        _session.claimed = _session.claimed.add(_interest);

        return _interest;
    }

    /// @dev Calculate interest amount in crowns for individual slot
    /// @notice Returns interest amount (in number)
    function calculateInterest(uint256 _sessionId, address _address, uint256 _index) internal view returns(uint256) {
	    Session storage _session = sessions[_sessionId];
	    Balance storage _balance = balances[_sessionId][_address][_index];

	    /// @dev  How much of total deposit belongs to player as a floating number
	    uint256 _sessionCap = block.timestamp;
	    if (!isActive(_sessionId)) {
	        _sessionCap = _session.startTime.add(_session.period);
	    }

        uint256 claimedPerPoint = _session.claimedPerPoint.add(
            _sessionCap.sub(_session.lastInterestUpdate).mul(_session.interestPerPoint));

        uint256 _interest = _balance.sp.mul(claimedPerPoint).div(MULTIPLIER).sub(_balance.claimedAmount);

	    return _interest;
    }

    /// @notice Returns true if session is active
    function isActive(uint256 _sessionId) internal view returns(bool) {
	    if (sessions[_sessionId].totalReward == 0) {
	        return false;
	    }

        bool notActive = (now < sessions[_sessionId].startTime || 
                          now > sessions[_sessionId].startTime + sessions[_sessionId].period);

        return !notActive;
    }

    	
    /// @dev updateInterestPerToken set's up the amount of tokens earned since the beginning
	/// of the session to 1 token. It also updates the portion of it for the user.
	/// @param _sessionId is a session id
	function updateInterestPerPoint(uint256 _sessionId) internal returns(bool) {
		Session storage _session = sessions[_sessionId];

		uint256 _sessionCap = block.timestamp;
		if (isActive(_sessionId) == false) {
			_sessionCap = _session.startTime.add(_session.period);
		}

        // I calculate previous claimed rewards
        // (session.claimedPerPoint += (now - session.lastInterestUpdate) * session.interestPerToken)
		_session.claimedPerPoint = _session.claimedPerPoint.add(
			_sessionCap.sub(_session.lastInterestUpdate).mul(_session.interestPerPoint));

        // I record that interestPerPoint is 0.1 CWS (rewardUnit/totalSp) in session.interestPerToken
        // I update the session.lastInterestUpdate to now
		if (_session.totalSp == 0) {
			_session.interestPerPoint = 0;
		} else {
			_session.interestPerPoint = _session.rewardUnit.div(_session.totalSp); // 0.1
		}

		// we avoid sub. underflow, for calulating session.claimedPerPoint
		_session.lastInterestUpdate = _sessionCap;
	}
}
