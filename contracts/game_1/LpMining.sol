pragma solidity 0.6.7;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../seascape_nft/NftFactory.sol";

/// @title A Liquidity pool mining
/// @author Medet Ahmetson <admin@blocklords.io>
/// @notice Contract is attached to Seascape Nft Factory
contract LpMining is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    uint256 private constant scaler = 10**18;
	
    NftFactory nftFactory;
  
    IERC20 public immutable CWS;

    Counters.Counter private sessionId;

    /// @notice game event struct. as event is a solidity keyword, we call them session instead.
    struct Session {
		address stakingToken;  		// lp token, each session is attached to one lp token
        uint256 totalReward;   		// amount of CWS to airdrop
		uint256 period;        		// session duration in seconds
		uint256 startTime;     		// session start in unixtimestamp
		uint256 generation;    		// Seascape Nft generation
		uint256 claimed;       		// amount of distributed reward
		uint256 amount;        		// amount of lp token deposited to the session by users
		uint256 rewardUnit;    		// reward per second = totalReward/period
		uint256 interestPerToken; 	// total earned interest per token since the beginning
									// of the session
		uint256 claimedPerToken;
		uint256 lastInterestUpdate;
	}

    /// @notice balance of lp token that each player deposited to game session
    struct Balance {
		uint256 amount;        		// amount of deposited lp token
		uint256 claimed;       		// amount of claimed CWS reward
		uint256 claimedTime;
		bool minted;           		// Seascape Nft is claimed or not,
									// for every session, user can claim one nft only
		uint256 claimedReward;
		uint256 unpaidReward;       // Amount of CWS that contract should pay to user
	}

    mapping(address => uint256) public lastSessionIds;
    mapping(uint256 => Session) public sessions;
    mapping(uint256 => mapping(address => Balance)) public balances;
    mapping(uint256 => mapping(address => uint)) public depositTimes;

    event SessionStarted(address indexed stakingToken, uint256 sessionIdd, uint256 reward, uint256 startTime, uint256 endTime, uint256 generation);
    event Deposited(address indexed stakingToken, address indexed owner, uint256 sessionId, uint256 amount, uint256 startTime, uint256 totalStaked);
    event Claimed(address indexed stakingToken, address indexed owner, uint256 sessionId, uint256 amount, uint256 claimedTime);
    event Withdrawn(address indexed stakingToken, address indexed owner, uint256 sessionId, uint256 amount, uint256 startTime, uint256 totalStaked);
    event FactorySet(address indexed factoryAddress);	

    /// @dev CWS is not changable after contract deployment.
    constructor(IERC20 _cws, address _nftFactory) public {
		CWS = _cws;

		sessionId.increment(); 	// starts at value 1

		nftFactory = NftFactory(_nftFactory);
    }
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------

    /// @notice Starts a staking session for a finit _period of
    /// time, starting from _startTime. The _totalReward of
    /// CWS tokens will be distributed in every second. It allows to claim a
    /// a _generation Seascape NFT.
    function startSession(address _lpToken,  uint256 _totalReward, uint256 _period,  uint256 _startTime, uint256 _generation) external onlyOwner {
		require(_lpToken != address(0),
			"Seascape Staking: Staking token should not be equal to 0");
		require(_startTime > block.timestamp,
			"Seascape Staking: Seassion should start in the future");
		require(_period > 0,
			"Seascape Staking: Session duration should be greater than 0");
		require(_totalReward > 0,
			"Seascape Staking: Total reward of tokens should be greater than 0");

		// game session for the lp token was already created, then:
		uint256 _lastId = lastSessionIds[_lpToken];
		if (_lastId > 0) {
			require(isActive(_lastId)==false,     "Seascape Staking: Can't start when session is already active");
		}

		// required CWS balance of this contract
		require(CWS.balanceOf(address(this)) >= _totalReward, "Seascape Staking: Not enough balance of Crowns for reward");

		//--------------------------------------------------------------------
		// creating the session
		//--------------------------------------------------------------------
		uint256 _sessionId = sessionId.current();
		uint256 _rewardUnit = _totalReward.div(_period);	
		sessions[_sessionId] = Session(_lpToken, _totalReward, _period, _startTime, _generation, 0, 0, _rewardUnit,
			0, 0, _startTime);

		//--------------------------------------------------------------------
        // updating rest of session related data
		//--------------------------------------------------------------------
		sessionId.increment();
		lastSessionIds[_lpToken] = _sessionId;

		emit SessionStarted(_lpToken, _sessionId, _totalReward, _startTime, _startTime + _period, _generation);
    }
     
    /// @dev sets an nft factory, a smartcontract that mints tokens.
    /// the nft factory should give a permission on it's own side to this contract too.
    function setNftFactory(address _address) external onlyOwner {
		require(_address != address(0), "Seascape Staking: Nft Factory address can not be be zero");
		nftFactory = NftFactory(_address);

		emit FactorySet(_address);	    
    }

	function payDebt(uint256 _sessionId, address _address) external onlyOwner {
		Balance storage _balance = balances[_sessionId][_address];
		if (_balance.unpaidReward > 0) {
			uint256 crownsBalance = CWS.balanceOf(address(this));
			require(crownsBalance >= _balance.unpaidReward, "Seascape Staking: Not enough Crowns to transfer!");

			_safeTransfer(_address, _balance.unpaidReward);
			_balance.unpaidReward = 0;
		}
	}

    //--------------------------------------------------
    // Only game users
    //--------------------------------------------------

    /// @notice deposits _amount of LP token
    function deposit(uint256 _sessionId, uint256 _amount) external {
		require(_amount > 0,              "Seascape Staking: Amount to deposit should be greater than 0");
		require(_sessionId > 0,           "Seascape Staking: Session id should be greater than 0!");
		require(isActive(_sessionId), "Seascape Staking: Session is not active");

		updateInterestPerToken(_sessionId);

		IERC20 _token = IERC20(sessions[_sessionId].stakingToken);
		
		require(_token.balanceOf(msg.sender) >= _amount,                         "Seascape Staking: Not enough LP tokens to deposit");
		require(_token.transferFrom(msg.sender, address(this), _amount), "Seascape Staking: Failed to transfer LP tokens into contract");

		Session storage _session  = sessions[_sessionId];
		Balance storage _balance  = balances[_sessionId][msg.sender];

		// claim tokens if any
		if (_balance.amount > 0) {
			_claim(_sessionId);
		}

		// I add amount of deposits to session.amount
		_session.amount = _session.amount.add(_amount); // 10

		// interest per token is updated. maybe need to withdraw out?
		updateInterestPerToken(_sessionId);
		
		_balance.amount = _amount.add(_balance.amount);
		_balance.claimedTime = block.timestamp;

		depositTimes[_sessionId][msg.sender]    = block.timestamp;

		updateBalanceInterestPerToken(_sessionId, msg.sender);

		emit Deposited(_session.stakingToken, msg.sender, _sessionId, _amount, block.timestamp, _session.amount);
	}


	function claim(uint256 _sessionId) public returns(bool) {
		Balance storage _balance = balances[_sessionId][msg.sender];

		require(_balance.amount > 0, "Seascape Staking: No deposit was found");
		
		updateInterestPerToken(_sessionId);

		_claim(_sessionId);

		updateBalanceInterestPerToken(_sessionId, msg.sender);

		return true;
    }

    /// @notice Withdraws _amount of LP token
    /// of type _token out of Staking contract.
    function withdraw(uint256 _sessionId, uint256 _amount) external {
		Session storage _session = sessions[_sessionId];
		Balance storage _balance  = balances[_sessionId][msg.sender];

		require(_balance.amount >= _amount, "Seascape Staking: Exceeds the balance that user has");

		updateInterestPerToken(_sessionId);

		IERC20 _token = IERC20(sessions[_sessionId].stakingToken);
			
		require(_token.balanceOf(address(this)) >= _amount, "Seascape Staking: Not enough Lp token in player balance");
		uint256 _interest = calculateInterest(_sessionId, msg.sender);

		uint256 _contractBalance = CWS.balanceOf(address(this));
		if (_interest > 0 && _contractBalance < _interest) {
			_balance.unpaidReward = _interest.sub(_contractBalance).add(_balance.unpaidReward);
		}

		_balance.amount = _balance.amount.sub(_amount);
		_session.amount = _session.amount.sub(_amount);

		/// CWS claims as in claim method
		if (_interest > 0) {
			_session.claimed     = _session.claimed.add(_interest);	
			_balance.claimed     = _balance.claimed.add(_interest);
			if (isActive(_sessionId) == false) {
				_balance.claimedTime = _session.startTime.add(_session.period);
			} else {
				_balance.claimedTime = block.timestamp;
			}

			_safeTransfer(msg.sender, _interest);
			emit Claimed(_session.stakingToken, msg.sender, _sessionId, _interest, block.timestamp);	
		}
		require(_token.transfer(msg.sender, _amount), "Seascape Staking: Failed to transfer token from contract to user");

		// change the session.interestPerToken
		updateInterestPerToken(_sessionId);
		updateBalanceInterestPerToken(_sessionId, msg.sender);

		emit Withdrawn(sessions[_sessionId].stakingToken, msg.sender, _sessionId, _amount, block.timestamp, sessions[_sessionId].amount);
    }

    /// @notice Mints an NFT for staker. One NFT per session, per token. and should be a deposit
    function claimNft(uint256 _sessionId) external {
		// it also indicates that session exists
		Balance storage _balance = balances[_sessionId][msg.sender];
		require(_balance.claimed.add(_balance.amount) > 0, "Seascape Staking: Deposit first");

		// uncomment in a production mode:
		require(_balance.minted == false, "Seascape Staking: Already minted");

		uint256 _tokenId = nftFactory.mint(msg.sender, sessions[_sessionId].generation);
		require(_tokenId > 0,                              "Seascape Staking: failed to mint a token");
		
		balances[_sessionId][msg.sender].minted = true;
    }

    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

    /// @notice Returns amount of Token staked by _owner
    function stakedBalanceOf(uint256 _sessionId, address _owner) external view returns(uint256) {
		return balances[_sessionId][_owner].amount;
    }

    /// @notice Returns amount of CWS Tokens earned by _address
    function earned(uint256 _sessionId, address _owner) external view returns(uint256) {
		uint256 _interest = calculateInterest(_sessionId, _owner);
		return balances[_sessionId][_owner].claimed.add(_interest);
    }

    /// @notice Returns amount of CWS Tokens that _address could claim.
    function claimable(uint256 _sessionId, address _owner) external view returns(uint256) {
		return calculateInterest(_sessionId, _owner);
    }

    /// @notice Returns total amount of Staked LP Tokens
    function stakedBalance(uint256 _sessionId) external view returns(uint256) {
		return sessions[_sessionId].amount;
    }

    //---------------------------------------------------
    // Internal methods
    //---------------------------------------------------

    /// @dev check whether the session is active or not
    function isActive(uint256 _sessionId) internal view returns(bool) {
		uint256 _endTime = sessions[_sessionId].startTime.add(sessions[_sessionId].period);

		// _endTime will be 0 if session never started.
		if (now > _endTime) {
	    	return false;
		}

		return true;
    }

    function calculateInterest(uint256 _sessionId, address _owner) internal view returns(uint256) {	    
		Session storage _session = sessions[_sessionId];
		Balance storage _balance = balances[_sessionId][_owner];

		// How much of total deposit is belong to player as a floating number
		if (_balance.amount == 0 || _session.amount == 0) {
			return 0;
		}

		uint256 _sessionCap = block.timestamp;
		if (isActive(_sessionId) == false) {
			_sessionCap = _session.startTime.add(_session.period);

			// claimed after session expire, means no any claimables
			if (_balance.claimedTime >= _sessionCap) {
				return 0;
			}
		}

		uint256 claimedPerToken = _session.claimedPerToken.add(
			_sessionCap.sub(_session.lastInterestUpdate).mul(_session.interestPerToken));
		
		// (balance * total claimable) - user deposit earned amount per token - balance.claimedTime
    	uint256 _interest = _balance.amount.mul(claimedPerToken).div(scaler).sub(_balance.claimedReward);

		return _interest;
    }

	
	/// @dev updateInterestPerToken set's up the amount of tokens earned since the beginning
	/// of the session to 1 token. It also updates the portion of it for the user.
	/// @param _sessionId is a session id
	function updateInterestPerToken(uint256 _sessionId) internal returns(bool) {
		Session storage _session = sessions[_sessionId];

		uint256 _sessionCap = block.timestamp;
		if (isActive(_sessionId) == false) {
			_sessionCap = _session.startTime.add(_session.period);
		}

        // I calculate previous claimed rewards
        // (session.claimedPerToken += (now - session.lastInterestUpdate) * session.interestPerToken)
		_session.claimedPerToken = _session.claimedPerToken.add(
			_sessionCap.sub(_session.lastInterestUpdate).mul(_session.interestPerToken));

        // I record that interestPerToken is 0.1 CWS (rewardUnit/amount) in session.interestPerToken
        // I update the session.lastInterestUpdate to now
		if (_session.amount == 0) {
			_session.interestPerToken = 0;
		} else {
			_session.interestPerToken = _session.rewardUnit.mul(scaler).div(_session.amount); // 0.1
		}

		// we avoid sub. underflow, for calulating session.claimedPerToken
		_session.lastInterestUpdate = _sessionCap;
	}

	function updateBalanceInterestPerToken(uint256 _sessionId, address _owner) internal returns(bool) {
		Session storage _session = sessions[_sessionId];
		Balance storage _balance = balances[_sessionId][_owner];

		// also, need to attach to alex, 
		// that previous earning (session.claimedPerToken) is 0.
		_balance.claimedReward = _session.claimedPerToken.mul(_balance.amount).div(scaler); // 0
	}

	function _claim(uint256 _sessionId) internal returns(bool) {
		Session storage _session = sessions[_sessionId];
		Balance storage _balance = balances[_sessionId][msg.sender];

		require(_balance.amount > 0, "Seascape Staking: No deposit was found");
		
		uint256 _interest = calculateInterest(_sessionId, msg.sender);
		if (_interest == 0) {
			return false;
		}
		uint256 _contractBalance = CWS.balanceOf(address(this));
		if (_interest > 0 && _contractBalance < _interest) {
			_balance.unpaidReward = _interest.sub(_contractBalance).add(_balance.unpaidReward);
		}

		// we avoid sub. underflow, for calulating session.claimedPerToken
		if (isActive(_sessionId) == false) {
			_balance.claimedTime = _session.startTime.add(_session.period);
		} else {
			_balance.claimedTime = block.timestamp;
		}
		_session.claimed     = _session.claimed.add(_interest);
		_balance.claimed     = _balance.claimed.add(_interest);
		
		_safeTransfer(msg.sender, _interest);
			
		emit Claimed(_session.stakingToken, msg.sender, _sessionId, _interest, block.timestamp);
		return true;
    }

	function _safeTransfer(address _to, uint256 _amount) internal {
		uint256 _crownsBalance = CWS.balanceOf(address(this));
        if (_amount > _crownsBalance) {
            CWS.transfer(_to, _crownsBalance);
        } else {
            CWS.transfer(_to, _amount);
        }
	}
}


