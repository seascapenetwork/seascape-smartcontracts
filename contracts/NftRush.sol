pragma solidity 0.6.7;

import "./crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";
import "./openzeppelin/contracts/access/Ownable.sol";
import "./openzeppelin/contracts/math/SafeMath.sol";
import "./openzeppelin/contracts/utils/Counters.sol";
import "./SeascapeNftTypes.sol";
import "./NFTFactory.sol";

contract NftRush is Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;
    using NftTypes for NftTypes;

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

    constructor(address _crowns, address _factory, uint256 _minDeposit) public {
	// Starts at value 1. 
	sessionId.increment();

	nftFactory = NFTFactory(_factory);

	crowns = CrownsToken(_crowns);

	minDeposit = _minDeposit;
    }

    uint256 public lastSessionId;
    mapping(uint256 => Session) public sessions;
    mapping(uint256 => mapping(address => Balance)) public balances;
    mapping(uint256 => mapping(address => uint)) public depositTime;

    // struct: session id => timestamp
    mapping(uint256 => uint256) public dailyWinnersTime;
    mapping(address => uint256) private dailyClaimablesAmount;
    mapping(address => uint256[]) private dailyClaimablesSessions;

    event SessionStarted(uint256 id, uint256 startTime, uint256 endTime, uint256 generation);
    event Deposited(address indexed owner, uint256 id, uint256 amount, uint256 startTime);
    event Claimed(address indexed owner, uint256 id, string indexed claimType, uint256 claimedTime);
    
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

	dailyWinnersTime[_sessionId] = _startTime;

	emit SessionStarted(_sessionId, _startTime, _startTime + _period, _generation);
    }
 

    function isStartedFor(uint256 _sessionId) internal view returns(bool) {
	if (now > sessions[_sessionId].startTime + sessions[_sessionId].period) {
	    return false;
	}

	return true;
    }

    function isDailyWinnersAdded(uint256 _sessionId) internal view returns(bool) {
	return block.timestamp < dailyWinnersTime[_sessionId] + (1 days);
    }


    function setDailyWinnersTime(uint256 _sessionId) internal {
	dailyWinnersTime[_sessionId] = block.timestamp + (1 days);
    }
    
    
    /// @notice Sets a NFT factory that will mint a token for stakers
    function setNftFactory(address _address) external onlyOwner {
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
	require(_amount >= minDeposit,     "NFT Rush: Amount to deposit should be greater than min deposit");
	require(_sessionId > 0,           "NFT Rush: Session is not started yet!");
	require(isStartedFor(_sessionId), "NFT Rush: Session is finished");

	require(crowns.balanceOf(msg.sender) >= _amount,
		"NFT Rush: Not enough CWS to deposit");
	require(crowns.spendFrom(msg.sender, _amount) == true,
		"NFT Rush: Failed to transfer CWS into contract");

	Balance storage _balance  = balances[_sessionId][msg.sender];

	_balance.amount = _balance.amount.add(_amount);
	
	depositTime[_sessionId][msg.sender]    = block.timestamp;
       
        emit Deposited(msg.sender, _sessionId, _amount, block.timestamp);
    }


    /// @dev claim a function
    function claim(uint256 _sessionId, uint8 _v, bytes32 _r, bytes32 _s, uint8 _quality) public {
	Session storage _session = sessions[_sessionId];
	Balance storage _balance = balances[_sessionId][msg.sender];

	require(_balance.amount > 0, "Seascape Staking: No deposit was found");

	/// Validation of quality
	// message is generated as owner + amount + last time stamp + quality
	bytes memory _prefix = "\x19Ethereum Signed Message:\n32";
	bytes32 _messageNoPrefix = keccak256(abi.encodePacked(msg.sender, _balance.amount, _balance.mintedTime, _quality));

	bytes32 _message = keccak256(abi.encodePacked(_prefix, _messageNoPrefix));

	address _recover = ecrecover(_message, _v, _r, _s);

	require(_recover == owner(),
		"NFT Rush: Quality verification failed");

	require(_balance.mintedTime == 0 || (_balance.mintedTime + _session.interval >= block.timestamp),
		"NFT Rush: not enough interval since last minted time");
	
	if (nftFactory.mintQuality(msg.sender, _session.generation, _quality)) {
            emit Claimed(msg.sender, _sessionId, "claim", block.timestamp);

            _balance.mintedTime = block.timestamp;
	    _balance.amount = 0;
	}
    }


    function addDailyWinners(uint256 _sessionId, address[10] memory _winners) public onlyOwner {
	require(isStartedFor(_sessionId) == true, "NFT Rush: session is finished");
	require(isDailyWinnersAdded(_sessionId) == false, "NFT Rush: daily winners set already");


	setDailyWinnersTime(_sessionId);
	
	for (uint i=0; i<10; i++) {
	    dailyClaimablesSessions[_winners[i]].push(_sessionId);
	    dailyClaimablesAmount[_winners[i]] = dailyClaimablesAmount[_winners[i]].add(1);
	}
    }

    function claimDailyNft() public {
	require(dailyClaimablesAmount[_msgSender()] > 0, "NFT Rush: no daily leaderboard claimable found");

	uint256 _claimAmount = dailyClaimablesAmount[_msgSender()];
	uint256[] storage _claimSession = dailyClaimablesSessions[_msgSender()];

	uint256 _sessionId = _claimSession[_claimAmount-1];

	uint256 _generation = sessions[_sessionId].generation;
	
	if (nftFactory.mintQuality(msg.sender, _generation, NftTypes.RARE)) {
	    delete _claimSession[_claimAmount-1];
	    dailyClaimablesAmount[_msgSender()] = _claimAmount.sub(1);
	    
            emit Claimed(msg.sender, _sessionId, "daily", block.timestamp);
	}
    }

    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------
    
}
