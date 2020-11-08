pragma solidity 0.6.7;

import "./crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";
import "./openzeppelin/contracts/access/Ownable.sol";
import "./openzeppelin/contracts/math/SafeMath.sol";
import "./openzeppelin/contracts/utils/Counters.sol";
import "./NFTFactory.sol";

contract NftRush is Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    NFTFactory nftFactory;
    
    Counters.Counter private sessionId;

    CrownsToken private crowns;
    uint256 private minDeposit;
    
    struct Session {
	uint256 interval;      // period between intervals
	uint256 period;        // duration of session
	uint256 startTime;     // unix timestamp when session starts
	uint256 generation;    // nft generation
    }

    struct Balance {
	uint256 amount;
	uint256 mintedTime;
    }

    constructor(address _crowns, address _factory) public {
	// Starts at value 1. 
	sessionId.increment();

	nftFactory = NFTFactory(_factory);

	crowns = CrownsToken(_crowns);
    }

    uint256 public lastSessionId;
    mapping(uint256 => Session) public sessions;
    mapping(uint256 => mapping(address => Balance)) public balances;
    mapping(uint256 => mapping(address => uint)) public depositTime;

    event SessionStarted(uint256 id, uint256 startTime, uint256 endTime, uint256 generation);
    event Deposited(address indexed owner, uint256 id, uint256 amount, uint256 startTime);
    event Claimed(address indexed owner, uint256 id, uint256 amount, uint256 claimedTime);
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------
    
    /// @notice Starts a staking session for a finit _period of
    /// time, starting from _startTime. The _totalReward of
    /// CWS tokens will be distributed in every second. It allows to claim a
    /// a _generation Seascape NFT.
    function startSession(uint256 _interval,      // duration between claimings
			  uint256 _period,        // duration of session in seconds
			  uint256 _startTime,     // unix timestamp
			  uint256 _generation) external onlyOwner {

	if (lastSessionId > 0) {
	    require(isStartedFor(lastSessionId)==false, "NFT Rush: Can't start when session is active");
	}

	uint256 _sessionId = sessionId.current();

	sessions[_sessionId] = Session(_interval, _period, _startTime, _generation);

	sessionId.increment();
	lastSessionId = _sessionId;

	emit SessionStarted(_sessionId, _startTime, _startTime + _period, _generation);
    }
 

    function isStartedFor(uint256 _sessionId) internal view returns(bool) {
	if (now > sessions[_sessionId].startTime + sessions[_sessionId].period) {
	    return false;
	}

	return true;
    }
    
    
    /// @notice Sets a NFT factory that will mint a token for stakers
    function setNFTFactory(address _address) external onlyOwner {
	nftFactory = NFTFactory(_address);
    }


    function setMinDeposit(uint256 _deposit) external onlyOwner {
	minDeposit = _deposit;
    }
    
    //--------------------------------------------------
    // Only staker
    //--------------------------------------------------

    /// @notice Deposits _amount of LP token
    /// of type _token into Staking contract.
    function deposit(uint256 _sessionId, uint256 _amount) external {
	require(_amount > 0,              "NFT Rush: Amount to deposit should be greater than 0");
	require(_sessionId > 0,           "NFT Rush: Session is not started yet!");
	require(isStartedFor(_sessionId), "NFT Rush: Session is finished");

	require(crowns.balanceOf(msg.sender) >= _amount,
		"NFT Rush: Not enough CWS to deposit");
	require(crowns.spendFrom(msg.sender, _amount) == true,
		"NFT Rush: Failed to transfer CWS into contract");

	Session storage _session  = sessions[_sessionId];
	Balance storage _balance  = balances[_sessionId][msg.sender];
	uint _depositTime = depositTime[_sessionId][msg.sender];

	bool _minted             = false;
	if (_depositTime > _session.startTime) {
	    _minted = _balance.minted;
	}
		
	if (_balance.amount > 0) {
	    claim(_sessionId);
	    _balance.amount = _amount.add(_balance.amount);
	    _balance.minted = _minted;
	} else {
	    // If user withdrew all LP tokens, but deposited before for the session
	    // Means, that player still can't mint more token anymore.
            balances[_sessionId][msg.sender] = Balance(_amount, 0, block.timestamp, _minted);
	}
	
	_session.amount                        = _session.amount.add(_amount);
	depositTime[_sessionId][msg.sender]    = block.timestamp;
       
        emit Deposited(_session.stakingToken, msg.sender, _sessionId, _amount, block.timestamp, _session.amount);
    }


    function claim(uint256 _sessionId) public {
	Session storage _session = sessions[_sessionId];
	Balance storage _balance = balances[_sessionId][msg.sender];

	require(_balance.amount > 0, "Seascape Staking: No deposit was found");
	
	uint256 _interest = calculateInterest(_sessionId, msg.sender);

	require(CWS.transfer(msg.sender, _interest) == true,
		"Seascape Staking: Failed to transfer reward CWS token");
		
	_session.claimed     = _session.claimed.add(_interest);
	_balance.claimed     = _balance.claimed.add(_interest);
	_balance.claimedTime = block.timestamp;
	rewardSupply         = rewardSupply.sub(_interest);

	emit Claimed(_session.stakingToken, msg.sender, _sessionId, _interest, block.timestamp);
    }

    function calculateInterest(uint256 _sessionId, address _owner) internal view returns(uint256) {
	Session storage _session = sessions[_sessionId];
	Balance storage _balance = balances[_sessionId][_owner];

	// How much of total deposit is belong to player as a floating number
	if (_balance.amount == 0 || _session.amount == 0) {
	    return 0;
	}

	uint256 _sessionCap = block.timestamp;
	if (isStartedFor(_sessionId) == false) {
	    _sessionCap = _session.startTime.add(_session.period);
	}

	uint256 _portion = _balance.amount.mul(scaler).div(_session.amount);
	
       	uint256 _interest = _session.rewardUnit.mul(_portion).div(scaler);

	// _balance.startTime is misleading.
	// Because, it's updated in every deposit time or claim time.
	uint256 _earnPeriod = _sessionCap.sub(_balance.claimedTime);
	
	return _interest.mul(_earnPeriod);
    }

    /// @notice Withdraws _amount of LP token
    /// of type _token out of Staking contract.
    function withdraw(uint256 _sessionId, uint256 _amount) external {
	Balance storage _balance  = balances[_sessionId][msg.sender];

	require(_balance.amount >= _amount, "Seascape Staking: Exceeds the balance that user has");

	claim(_sessionId);

	IERC20 _token = IERC20(sessions[_sessionId].stakingToken);

	require(_token.transfer(msg.sender, _amount) == true, "Seascape Staking: Failed to transfer token from contract to user");
	
	_balance.amount = _balance.amount.sub(_amount);
	sessions[_sessionId].amount = sessions[_sessionId].amount.sub(_amount);

	emit Withdrawn(sessions[_sessionId].stakingToken, msg.sender, _sessionId, _amount, block.timestamp, sessions[_sessionId].amount);
    }

    /// @notice Mints an NFT for staker. One NFT per session, per token.
    function claimNFT(uint256 _sessionId) external {
	require(isStartedFor(_sessionId), "Seascape Staking: No active session");

	Balance storage _balance = balances[_sessionId][msg.sender];
	require(_balance.claimed.add(_balance.amount) > 0, "Seascape Staking: Deposit first");
	require(_balance.minted == false, "Seascape Staking: Already minted");

	if (nftFactory.mint(msg.sender, sessions[_sessionId].generation)) {
	    balances[_sessionId][msg.sender].minted = true;
	}
    }


    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

}

