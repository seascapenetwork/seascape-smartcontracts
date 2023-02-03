pragma solidity 0.6.7;

import "./../../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../../openzeppelin/contracts/access/Ownable.sol";
import "./../../openzeppelin/contracts/math/SafeMath.sol";
import "./../../openzeppelin/contracts/utils/Counters.sol";
import "./../../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../../seascape-nft/NftFactory.sol";
import "./../../seascape-nft/SeascapeNft.sol";

/// @title Seascape NFT staking contract.
/// @author Medet Ahmetson <admin@blocklords.io>
/// @notice Nft Staking contract allows users to earn CWS token by staking NFTs.
/// Nfts will have a Seascape point. Which is the weight of token
/// in Seascape Network platform. The Seascape Point is calculated by Nft parameters
/// such as generation and quality.
/// The higher the NFT weight, the more user gets reward for NFT staking.
contract StakingSaloon is Ownable, IERC721Receiver {
    using SafeMath for uint256;
    using Counters for Counters.Counter;//

    uint256 constant MULTIPLIER = 10**18;

    NftFactory nftFactory;//

    SeascapeNft private nft;//

    Counters.Counter private sessionId;//
    address public verifier;//
    IERC20 public rewardToken;//

    /// @notice game event struct. as event is a solidity keyword, we call them session instead.
    struct Session {
        uint256 totalReward;   // amount of CWS to give as a reward during the session.
        uint256 period;        // session duration in seconds
        uint256 startTime;     // session start in unixtimestamp
        uint256 claimed;       // amount of distributed reward 
        uint256 totalSp;       // amount of seascape points of all NFTs deposited to the session by users
    	uint256 rewardUnit;       // reward per second = totalReward/period 
        uint256 interestPerPoint;  
        uint256 claimedPerPoint;   
        uint256 lastInterestUpdate;  
        bool burn;             //default true or false depends on request.  burn or don't burn
        bool specify;          //default true or false depends on request.  specify NFT or don't  
        uint8 signinRewardNum; //total sign reward number about this session  
    }

    /// @notice balance of lp token that each player deposited to game session
    struct Balance {               
        uint256 claimedTime;       // amount of claimed CWS reward
    	uint256 nftId;             // nftID
        uint256 sp;                // seascape points
        uint256 claimedAmount;     // claimed reward
    }

    struct Params {                
        uint256 imgId;            
        uint256 generation;        
        uint8   quality;           
    }

    // give to the user reward, when the signin requirements are met
    mapping(uint256 => mapping(uint8 => Params)) public signinRewards;

    mapping(address => uint256) debts;

    /// @dev keep track of the current session
    uint256 public lastSessionId;
    mapping(address => uint256) public nonce;
    mapping(uint256 => Session) public sessions;
    mapping(uint256 => mapping(address => uint256)) public slots;
    mapping(uint256 => mapping(address => Balance[3])) public balances;
    mapping(uint256 => mapping(address => uint)) public depositTimes;
    mapping(uint256 => mapping(address => uint256)) public earning;
    mapping(uint256 => mapping(address => mapping(uint8 => bool))) public received; //default false, if get a reward change true

    event SessionStarted(uint256 sessionIdd, uint256 reward, uint256 startTime, uint256 endTime);
    event Deposited(address msgsender, uint256 _sessionId, uint256 nfts0, uint256 nfts1, uint256 nfts2, uint256 Dtime);
    event Claimed(address indexed owner, uint256 sessionId, uint256 amount, uint256 nftId);
    event BonusClaimed(address indexed owner, uint256 sessionId, uint256 baseAmount, uint256 amountWithBonus, uint256 percents);
    event NftFactorySet(address factory);
    event AddSignInReward(uint256 sessionId, uint8 completedNum, uint256 imgId, uint256 generation, uint8 quality);
    event GetSignInReward(address owner, uint256 sessionId, uint8 completedNum, uint256 NftId, uint256 generation, uint8 quality, uint256 imgId);

    /// @dev instantinate contracts, start session
    constructor(address _nftFactory, address _nft) public {
        require(_nftFactory != address(0), "Nft Factory can't be zero address");
        require(_nft != address(0), "Nft can't be zero address");
        sessionId.increment(); 	// starts at value 1
        nftFactory = NftFactory(_nftFactory);
        nft = SeascapeNft(_nft);
    }

    //--------------------------------------------------
    // External methods
    //--------------------------------------------------

    /// @dev encrypt token data
    /// @return encrypted data
    function onERC721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice Starts a staking session for a finite _period of
    /// time, starting from _startTime. The _totalReward of
    /// CWS tokens will be distributed in every second.
    /// _
    function startSession(
        address _rewardToken,
        uint256 _totalReward,
        uint256 _period,
        uint256 _startTime,
        address _verifier,
        bool _burn,//true burn nft, false don't burn nft.
        bool _specify//true specify nft, false unspecify nft.
    )
        external
        onlyOwner
    {
        require(_rewardToken != address(0), "Token can't be zero address");
        require(_startTime > block.timestamp, "Seascape Staking: Seassion should start in the future");
        require(_period > 0, "Seascape Staking: Session duration should be greater than 0");
    	require(_totalReward > 0, "Seascape Staking: Reward amount should be greater than 0");
        require(_verifier != address(0), "verifier can't be zero address");

      	if (lastSessionId > 0) {
      	    require(!isActive(lastSessionId), "Seascape Staking: Can't start when session is active");
      	}
        
        if (_rewardToken != address(0)) {
            IERC20 _reward = IERC20(_rewardToken);

            // required reward balance of this contract
            require(_reward.balanceOf(address(this)) >= _totalReward, "saloon: Not enough balance of reward token");
        } else {
            require(address(this).balance >= _totalReward, "saloon: Not enough balance of native reward");
        }
      	/// @dev required CWS balance of this contract

      	//--------------------------------------------------------------------
      	// creating the session
      	//--------------------------------------------------------------------
      	uint256 _sessionId = sessionId.current();
      	uint256 _rewardUnit = _totalReward.mul(MULTIPLIER).div(_period);
        sessions[_sessionId] = Session(_totalReward, _period, _startTime, 0, 0, _rewardUnit, 0, 0, _startTime, _burn, _specify, 0);

      	//--------------------------------------------------------------------
        // updating rest of session related data
      	//--------------------------------------------------------------------
      	sessionId.increment();
        rewardToken = IERC20(_rewardToken);
      	lastSessionId = _sessionId;
        verifier = _verifier;

      	emit SessionStarted(_sessionId, _totalReward, _startTime, _startTime + _period);
    }

    /// @dev sets an nft factory, a smartcontract that mints tokens.
    /// the nft factory should give a permission on it's own side to this contract too.
    function setNftFactory(address _address) external onlyOwner {
        require(_address != address(0), "Nft Factory can't be zero address");
        nftFactory = NftFactory(_address);

        emit NftFactorySet(_address);
    }

    function payDebt(uint256 _sessionId, address _address) external onlyOwner {
        require(_sessionId > 0, "Nft Staking: Session id should be greater than 0!");

		uint256 _debt = debts[_address];
        if (_debt > 0) {
			uint256 crownsBalance = rewardToken.balanceOf(address(this));
			require(crownsBalance >= _debt, "Nft Staking: Not enough Crowns to transfer!");

			rewardToken.transfer(_address, _debt);
			debts[_address] = 0;

            earning[_sessionId][_address] = earning[_sessionId][_address].add(_debt);
		}
	}

    /// @notice deposits nft to stake along with it's SP
    

    function deposit(uint256 _sessionId, bytes calldata data, uint8 _v, bytes32 _r, bytes32 _s) external{
        require(_sessionId > 0, "Session has not started yet");
        require(isActive(_sessionId), "Session not active");
        
        updateCalculation(_sessionId);
        Session storage _session = sessions[_sessionId];
        Balance[3] storage _balances = balances[_sessionId][msg.sender];
        (uint256[3] memory _nfts, uint256[3] memory _sp) = abi.decode(data, (uint256[3], uint256[3]));
        
        //Check whether NFT is stored in the card slot
        for(uint8 _index = 0; _index < 3; ++_index){
            require(!(_balances[_index].nftId > 0 && _nfts[_index] > 0), "Saloon: this slot is stored");
             if(_nfts[_index] > 0) {
             require(nft.ownerOf(_nfts[_index]) == msg.sender, "Saloon: Nft is not owned by caller");
            }
        }

        //verify VRS
        {
            bytes32 _messageNoPrefix = keccak256(abi.encodePacked(_sessionId, _nfts[0], _sp[0], _nfts[1], _sp[1], _nfts[2], _sp[2], nonce[msg.sender], msg.sender));
            bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
            address _recover = ecrecover(_message, _v, _r, _s);
            require(_recover == verifier,  "Nft Staking: Seascape points verification failed");
        }
        ++nonce[msg.sender];
        //If deposit NFT,Transfer of NFT and change the variable 
        for (uint8 _index = 0; _index < 3; ++_index) {

            if(_nfts[_index] > 0) {
                //transfer NFT to contract
                nft.safeTransferFrom(msg.sender, address(this), _nfts[_index]);
                slots[_sessionId][msg.sender] = slots[_sessionId][msg.sender].add(1);
                _session.totalSp = _session.totalSp.add(_sp[_index]);

                _balances[_index] = Balance(block.timestamp, _nfts[_index], _sp[_index], 0);
                _balances[_index].claimedAmount = _session.claimedPerPoint.mul(_balances[_index].sp).div(MULTIPLIER); // 0
            }         
        }

        // update the interestPerPoint variable of the session
        updateInterestPerPoint(_sessionId);

        depositTimes[_sessionId][msg.sender] = block.timestamp;
        
        emit Deposited(msg.sender, _sessionId, _nfts[0], _nfts[1], _nfts[2], block.timestamp);
    }

    function claim(uint256 _sessionId, uint256 _index) external {
        require(_index <= 2, "Nft Staking: slot index is invalid");
        require(balances[_sessionId][msg.sender][_index].nftId > 0, "Nft Staking: Slot at index is empty");

        updateCalculation(_sessionId);

      	Balance storage _balance = balances[_sessionId][msg.sender][_index];
      	uint256 _nftId = _balance.nftId;

        if( sessions[_sessionId].burn) {
            nft.safeTransferFrom(address(this), 0x000000000000000000000000000000000000dEaD, _nftId);
        } else {
            nft.safeTransferFrom(address(this), msg.sender, _nftId);
        }

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
        /// if specify is true, send bonus
      	if (slots[_sessionId][msg.sender] == 3 && _bonusPercent > 0 && sessions[_sessionId].specify) {
      	    require(verifyBonus(_sessionId, _bonusPercent, _v, _r, _s), "NFT Staking: bonus signature is invalid");
            require(giveBonus(_sessionId, _bonusPercent), "NFT Staking: failed to transfer bonus to player");
      	}

	    claimAll(_sessionId);
    }

    function claimAll(uint256 _sessionId) public {
	    require(slots[_sessionId][msg.sender] > 0, "Nft Staking: all slots are empty");

      	for (uint _index=0; _index < 3; ++_index) {
            Balance storage _balance = balances[_sessionId][msg.sender][_index];

            if (_balance.nftId > 0){
                uint256 _claimed = transfer(_sessionId, _index);

                earning[_sessionId][msg.sender] = earning[_sessionId][msg.sender].add(_claimed);

                updateCalculation(_sessionId);

          	    uint256 _nftId = _balance.nftId;
    	        uint256 _sp = _balance.sp;
          	   
                if( sessions[_sessionId].burn) {
                    nft.safeTransferFrom(address(this), 0x000000000000000000000000000000000000dEaD, _nftId);
                } else {
                    nft.safeTransferFrom(address(this), msg.sender, _nftId);
                }
                
          	    delete balances[_sessionId][msg.sender][_index];
    	    
          	    sessions[_sessionId].totalSp = sessions[_sessionId].totalSp.sub(_sp);

                updateInterestPerPoint(_sessionId);

          	    emit Claimed(msg.sender, _sessionId, _claimed, _nftId);
            }
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
            _balance[2].nftId,
            nonce[msg.sender]
            ));
        /// Validation of bonus
	    /// @dev 3. verify that signature for message was signed by contract owner
      	bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      	address _recover = ecrecover(_message, _v, _r, _s);
      	require(_recover == verifier, "NFT Staking: Seascape points, verification failed");
        ++nonce[msg.sender];

        return true;
    }

    /// @dev calculate total bonus in crowns and send it to player
    /// @notice Returns true if bonus transaction was successful
    function giveBonus(uint256 _sessionId, uint256 _bonusPercent) internal returns(bool) {
	    uint256 _interests = 0;
	
        for(uint _index = 0; _index < 3; ++_index){
	        _interests = _interests.add(calculateInterest(_sessionId, msg.sender, _index));
        }

	    uint256 _totalBonus = _interests.mul(MULTIPLIER).mul(_bonusPercent).div(1000000).div(MULTIPLIER);
        require(rewardToken.allowance(owner(), address(this)) >= _totalBonus, "Seascape Staking: Not enough bonus balance");

        bool res = rewardToken.transferFrom(owner(), msg.sender, _totalBonus);
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

        uint256 _crownsBalance = rewardToken.balanceOf(address(this));
        if (_interest > 0 && _interest > _crownsBalance) {
            debts[msg.sender] = _interest.sub(_crownsBalance).add(debts[msg.sender]);
            rewardToken.transfer(msg.sender, _crownsBalance);
            _session.claimed = _session.claimed.add(_crownsBalance);

            return _crownsBalance;
        } else {
            rewardToken.transfer(msg.sender, _interest);
            _session.claimed = _session.claimed.add(_interest);
        }

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
	function updateCalculation(uint256 _sessionId) internal returns(bool) {
		Session storage _session = sessions[_sessionId];

		uint256 _sessionCap = block.timestamp;
		if (!isActive(_sessionId)) {
			_sessionCap = _session.startTime.add(_session.period);
		}

        // I calculate previous claimed rewards
        // (session.claimedPerPoint += (now - session.lastInterestUpdate) * session.interestPerToken)
		_session.claimedPerPoint = _session.claimedPerPoint.add(
			_sessionCap.sub(_session.lastInterestUpdate).mul(_session.interestPerPoint));

		/// @notice we avoid sub. underflow, for calculating session.claimedPerPoint
        /// @dev interest per point is updated in other function, so this variable 
        /// should be set in updateInterestPerPoint function.
        /// We don't do it, as because updateInterestPerPoint will be called after updateCalculation 
		_session.lastInterestUpdate = _sessionCap;
	}


    function updateInterestPerPoint(uint256 _sessionId) internal {
		Session storage _session = sessions[_sessionId];
        
        // I record that interestPerPoint is 0.1 CWS (rewardUnit/totalSp) in session.interestPerToken
        // I update the session.lastInterestUpdate to now
		if (_session.totalSp == 0) {
			_session.interestPerPoint = 0;
		} else {
			_session.interestPerPoint = _session.rewardUnit.div(_session.totalSp); // 0.1
		}
    }

    ///@dev add signin rewards to session
    function addSignInReward(uint256 _sessionId, bytes calldata data) external onlyOwner{  
        Session storage _session = sessions[_sessionId];

        require(isValidData(data), "saloon: signin reward isvaliddata failed");
        require(block.timestamp <= (_session.startTime + _session.period), "saloon: session end");

        (uint256 imgId, uint256 generation, uint8 quality) =
            abi.decode(data, (uint256, uint256, uint8));
        uint8 _tagNum;

        _session.signinRewardNum += 1;
        _tagNum = _session.signinRewardNum;

        signinRewards[_sessionId][_tagNum] = Params(imgId, generation, quality);
        received[_sessionId][msg.sender][_tagNum] = false;
        
        emit AddSignInReward(_sessionId, _tagNum, imgId, generation, quality);
    }

    //Get check-in revenue
    function getSignInReward(uint256 _sessionId, uint8 _tagNum, uint8 v, bytes32 r, bytes32 s) external {
        Params storage params = signinRewards[_sessionId][_tagNum];
        Session storage _session = sessions[_sessionId];
        
        require(received[_sessionId][msg.sender][_tagNum] == false, "saloon: this signid reward is already received");
        require(_tagNum <= _session.signinRewardNum, "saloon: this reward do not _tagNum");

        uint256 NftId;

        {
            bytes32 _messageNoPrefix = keccak256(abi.encodePacked(_sessionId, _tagNum, nonce[msg.sender], msg.sender));
            bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
            address _recover = ecrecover(_message, v, r, s);
            require(_recover == verifier,  "Verification failed");
        }
        ++nonce[msg.sender];
        if (params.quality > 0) {
           NftId = nftFactory.mintQuality(msg.sender, params.generation, params.quality);//transfer reward nft.
        }

        received[_sessionId][msg.sender][_tagNum] = true;

        emit GetSignInReward(msg.sender, _sessionId, _tagNum, NftId, params.generation, params.quality, params.imgId);
    }

    //check data
    function isValidData(bytes memory data) public pure returns (bool) {
        uint256 imgId;
        uint256 generation;
        uint8 quality;

        (imgId, generation, quality) = abi.decode(data, (uint256, uint256, uint8));

        if (quality < 0 || quality > 5) {
            return false;
        } 
        
        return true;
    }
    
}
