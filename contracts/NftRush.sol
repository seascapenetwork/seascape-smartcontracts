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
	bool    spentWinnersSet;    // was all time winners set
	bool    mintedWinnersSet;
    }

    struct Balance {
	uint256 amount;
	uint256 mintedTime;
    }

    struct Reward {
	uint256 sessionId;
	uint256 cws;
    }

    uint256 public lastSessionId;
    mapping(uint256 => Session) public sessions;
    mapping(uint256 => mapping(address => Balance)) public balances;
    mapping(uint256 => mapping(address => uint)) public depositTime;

    uint256[10] public spentDailyAmounts;        // spent token leaderboard
    uint256[10] public spentAllTimeAmounts;
    uint256[10] public mintedDailyAmounts;       // minted nft amount leaderboard
    uint256[10] public mintedAllTimeAmounts;

    // struct: session id => timestamp
    mapping(uint256 => uint256) public spentDailyWinnersTime;                  // tracks the last daily winners set time.
                                                                          // be careful, if the daily winners setting doesn't set all 10 winners,
                                                                          // you wouldn't be able to set missed winners in a next round
    mapping(address => uint256) public spentDailyClaimables;            // tracks amount of claimable nft for each user
    mapping(address => Reward[]) public spentDailyRewards;        // stores a session id where user won an nft.

    // session id => addresses
    mapping(address => uint256) public spentAllTimeClaimables;          // tracks the amount of leaderboard winning in sessions for each user
    mapping(address => Reward[]) public spentAllTimeRewards;      // session id

    // struct: session id => timestamp
    mapping(uint256 => uint256) public mintedDailyWinnersTime;                  // tracks the last daily winners set time.
                                                                          // be careful, if the daily winners setting doesn't set all 10 winners,
                                                                          // you wouldn't be able to set missed winners in a next round
    mapping(address => uint256) public mintedDailyClaimables;            // tracks amount of claimable nft for each user
    mapping(address => Reward[]) public mintedDailyRewards;        // stores a session id where user won an nft.

    // session id => addresses
    mapping(address => uint256) public mintedAllTimeClaimables;          // tracks the amount of leaderboard winning in sessions for each user
    mapping(address => Reward[]) public mintedAllTimeRewards;      // session id
    
    event SessionStarted(uint256 id, uint256 startTime, uint256 endTime, uint256 generation);
    event Spent(address indexed owner, uint256 sessionId, uint256 balanceAmount, uint256 prevMintedTime, uint256 amount);
    event Minted(address indexed owner, uint256 sessionId, uint256 nftId);
    event Rewarded(address indexed owner, uint256 sessionId, string rewardType, uint256 amount);	
	
    constructor(address _crowns, address _factory, uint256 _minDeposit) public {
	// Starts at value 1. 
	sessionId.increment();

	nftFactory = NFTFactory(_factory);

	crowns = CrownsToken(_crowns);

	minDeposit = _minDeposit;
    }

    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------
    
    /// @notice Starts a staking session for a finit _period of
    /// time, starting from _startTime. The _totalReward of
    /// CWS tokens will be distributed in every second. It allows to claim a
    /// a _generation Seascape NFT.
    /// @param _interval duration between claims
    /// @param _period session duration
    /// @param _startTime session start time in unix timestamp
    /// @param _generation Seascape Nft generation that is given as a reward
    function startSession(uint256 _interval, uint256 _period, uint256 _startTime, uint256 _generation) external onlyOwner {
	if (lastSessionId > 0) {
	    require(isStartedFor(lastSessionId)==false, "NFT Rush: Can't start when session is active");
	}

	uint256 _sessionId = sessionId.current();

	sessions[_sessionId] = Session(_interval, _period, _startTime, _generation, false, false);

	sessionId.increment();
	lastSessionId = _sessionId;

	spentDailyWinnersTime[_sessionId] = _startTime;
	mintedDailyWinnersTime[_sessionId] = _startTime;    

	emit SessionStarted(_sessionId, _startTime, _startTime + _period, _generation);
    }
 
    
    /// @notice Sets a NFT factory that will mint a token for stakers
    function setNftFactory(address _address) external onlyOwner {
	nftFactory = NFTFactory(_address);
    }


    function setMinDeposit(uint256 _deposit) external onlyOwner {
	minDeposit = _deposit;
    }

    function setAllRewards(uint256[10] memory _spentDaily, uint256[10] memory _spentAllTime, uint256[10] memory _mintedDaily, uint256[10] memory _mintedAllTime) public onlyOwner {
	setDailySpents(_spentDaily);
	setAllTimeSpents(_spentAllTime);
	setDailyMinted(_mintedDaily);
	setAllTimeMinted(_mintedAllTime);
    }

    function setAllSpents(uint256[10] memory _daily, uint256[10] memory _allTime) public onlyOwner {
	setDailySpents(_daily);
	setAllTimeSpents(_allTime);
    }

    function setAllMinted(uint256[10] memory _daily, uint256[10] memory _allTime) public onlyOwner {
	setDailyMinted(_daily);
	setAllTimeMinted(_allTime);
    }


    function setDailySpents(uint256[10] memory _rewards) public onlyOwner {
	spentDailyAmounts = _rewards;
    }

    function setAllTimeSpents(uint256[10] memory _rewards) public onlyOwner {
	spentAllTimeAmounts = _rewards;
    }

    function setDailyMinted(uint256[10] memory _rewards) public onlyOwner {	    
	mintedDailyAmounts = _rewards;
    }

    function setAllTimeMinted(uint256[10] memory _rewards) public onlyOwner {
	mintedAllTimeAmounts = _rewards;
    }
    
    function addDailySpentWinners(uint256 _sessionId, address[10] memory _winners, uint8 _amount) public onlyOwner {
	require(isDailySpentWinnersAdded(_sessionId) == false, "NFT Rush: already set or too early");
	require(_amount <= 10,                                 "NFT Rush: too many winners");

        if (_amount > 0) {
	    uint256 _totalRewards = calculateTotalRewards(spentDailyAmounts, _amount);	
            require(crowns.transferFrom(owner(), address(this), _totalRewards) == true, "NFT Rush: not enough CWS to give as a reward");	
    
            for (uint i=0; i<_amount; i++) {
		Reward memory _reward = Reward(_sessionId, spentDailyAmounts[i]);
		spentDailyRewards[_winners[i]].push(_reward);

		// increase amount of daily rewards that msg.sender could claim
		spentDailyClaimables[_winners[i]] = spentDailyClaimables[_winners[i]].add(1);
            }
	}

 	setDailySpentWinnersTime(_sessionId);
    }

    function addAllTimeSpentWinners(uint256 _sessionId, address[10] memory _winners, uint8 _amount) public onlyOwner {
	require(isAllTimeSpentWinnersAdded(_sessionId) == false, "NFT Rush: all time winners set already");
	require(_amount <= 10,                              "NFT Rush: too many winners");

	if (_amount > 0) {		    
	    uint256 _totalRewards = calculateTotalRewards(spentAllTimeAmounts, _amount);	
            require(crowns.transferFrom(owner(), address(this), _totalRewards) == true, "NFT Rush: not enough CWS to give as a reward");	
    
            for (uint i=0; i<_amount; i++) {
		Reward memory _reward = Reward(_sessionId, spentAllTimeAmounts[i]);
		spentAllTimeRewards[_winners[i]].push(_reward);

		// increase amount of daily rewards that msg.sender could claim
		spentAllTimeClaimables[_winners[i]] = spentAllTimeClaimables[_winners[i]].add(1);
            }
	}

	setAllTimeSpentWinnersTime(_sessionId);		
    }

    function addDailyMintedWinners(uint256 _sessionId, address[10] memory _winners, uint8 _amount) public onlyOwner {
	require(isDailyMintedWinnersAdded(_sessionId) == false, "NFT Rush: already set or too early");
	require(_amount <= 10,                                  "NFT Rush: too many winners");

        if (_amount > 0) {
	    uint256 _totalRewards = calculateTotalRewards(mintedDailyAmounts, _amount);	
            require(crowns.transferFrom(owner(), address(this), _totalRewards) == true, "NFT Rush: not enough CWS to give as a reward");	
    
            for (uint i=0; i<_amount; i++) {
		Reward memory _reward = Reward(_sessionId, mintedDailyAmounts[i]);
		mintedDailyRewards[_winners[i]].push(_reward);

		// increase amount of daily rewards that msg.sender could claim
		mintedDailyClaimables[_winners[i]] = mintedDailyClaimables[_winners[i]].add(1);
            }
	}

 	setDailyMintedWinnersTime(_sessionId);
    }

    function addAllTimeMintedWinners(uint256 _sessionId, address[10] memory _winners, uint8 _amount) public onlyOwner {
	require(isAllTimeMintedWinnersAdded(_sessionId) == false, "NFT Rush: all time winners set already");
	require(_amount <= 10,                                    "NFT Rush: too many winners");

	if (_amount > 0) {		    
	    uint256 _totalRewards = calculateTotalRewards(mintedAllTimeAmounts, _amount);	
            require(crowns.transferFrom(owner(), address(this), _totalRewards) == true, "NFT Rush: not enough CWS to give as a reward");	
    
            for (uint i=0; i<_amount; i++) {
		Reward memory _reward = Reward(_sessionId, mintedAllTimeAmounts[i]);
		mintedAllTimeRewards[_winners[i]].push(_reward);

		// increase amount of daily rewards that msg.sender could claim
		mintedAllTimeClaimables[_winners[i]] = mintedAllTimeClaimables[_winners[i]].add(1);
            }
	}

	setAllTimeMintedWinnersTime(_sessionId);		
    }

    //--------------------------------------------------
    // Only game user
    //--------------------------------------------------

    /// @notice Spend _amount of LP token
    /// of type _token into Staking contract.
    function spend(uint256 _sessionId, uint256 _amount) external {
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
       
        emit Spent(msg.sender, _sessionId, _balance.amount, _balance.mintedTime, _amount);
    }


    /// @dev mints an nft
    function mint(uint256 _sessionId, uint8 _v, bytes32 _r, bytes32 _s, uint8 _quality) public {
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

	require(_balance.mintedTime == 0 || (_balance.mintedTime + _session.interval < block.timestamp),
		"NFT Rush: not enough interval since last minted time");
	
        uint256 _tokenId = nftFactory.mintQuality(msg.sender, _session.generation, _quality);
	require(_tokenId > 0, "NFT Rush: failed to mint a token");
	

	_balance.mintedTime = block.timestamp;
	_balance.amount = 0;

	emit Minted(msg.sender, _sessionId, _tokenId);
    }

    function claimDailySpent() public {
	require(spentDailyClaimables[_msgSender()] > 0, "NFT Rush: reward not found");

	uint256 _claimAmount = spentDailyClaimables[_msgSender()];
	Reward[] storage _reward = spentDailyRewards[_msgSender()];

	uint256 _sessionId = _reward[_claimAmount-1].sessionId;		
	uint256 _amount = _reward[_claimAmount-1].cws;

	require(crowns.transferFrom(address(this), _msgSender(), _amount) == true, "NFT Rush: failed to reward CWS to winner");
	delete _reward[_claimAmount-1];
	spentDailyClaimables[_msgSender()] = _claimAmount.sub(1);
	    
	emit Rewarded(msg.sender, _sessionId, "spent-daily", _amount);
    }

    function claimAllTimeSpent() public {
	require(spentAllTimeClaimables[_msgSender()] > 0, "NFT Rush: reward not found");

	uint256 _claimAmount = spentAllTimeClaimables[_msgSender()];
	Reward[] storage _reward = spentAllTimeRewards[_msgSender()];

	uint256 _sessionId = _reward[_claimAmount-1].sessionId;
	uint256 _amount = _reward[_claimAmount-1].cws;

	require(crowns.transferFrom(address(this), _msgSender(), _amount) == true, "NFT Rush: failed to reward CWS to winner");
	delete _reward[_claimAmount-1];
	spentAllTimeClaimables[_msgSender()] = _claimAmount.sub(1);
	    
	emit Rewarded(msg.sender, _sessionId, "spent-alltime", _amount);
    }

    function claimDailyMinted() public {	    
	require(mintedDailyClaimables[_msgSender()] > 0, "NFT Rush: reward not found");

	uint256 _claimAmount = mintedDailyClaimables[_msgSender()];
	Reward[] storage _reward = mintedDailyRewards[_msgSender()];

	uint256 _sessionId = _reward[_claimAmount-1].sessionId;		
	uint256 _amount = _reward[_claimAmount-1].cws;

	require(crowns.transferFrom(address(this), _msgSender(), _amount) == true, "NFT Rush: failed to reward CWS to winner");
	delete _reward[_claimAmount-1];
	mintedDailyClaimables[_msgSender()] = _claimAmount.sub(1);
	    
	emit Rewarded(msg.sender, _sessionId, "minted-daily", _amount);
    }

    function claimAllTimeMinted() public {
	require(mintedAllTimeClaimables[_msgSender()] > 0, "NFT Rush: reward not found");

	uint256 _claimAmount = mintedAllTimeClaimables[_msgSender()];
	Reward[] storage _reward = mintedAllTimeRewards[_msgSender()];

	uint256 _sessionId = _reward[_claimAmount-1].sessionId;
	uint256 _amount = _reward[_claimAmount-1].cws;

	require(crowns.transferFrom(address(this), _msgSender(), _amount) == true, "NFT Rush: failed to reward CWS to winner");
	delete _reward[_claimAmount-1];
	mintedAllTimeClaimables[_msgSender()] = _claimAmount.sub(1);
	    
	emit Rewarded(msg.sender, _sessionId, "minted-alltime", _amount);
    }

    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------


    //--------------------------------------------------
    // Interval methods
    //--------------------------------------------------
    
    function isStartedFor(uint256 _sessionId) internal view returns(bool) {
	if (now > sessions[_sessionId].startTime + sessions[_sessionId].period) {
	    return false;
	}

	return true;
    }

    function isDailySpentWinnersAdded(uint256 _sessionId) internal view returns(bool) {
	return block.timestamp < spentDailyWinnersTime[_sessionId] + (1 days);
    }


    function setDailySpentWinnersTime(uint256 _sessionId) internal {
	spentDailyWinnersTime[_sessionId] = block.timestamp + (1 days);
    }
    
    function isAllTimeSpentWinnersAdded(uint256 _sessionId) internal view returns(bool) {
	Session storage _session = sessions[_sessionId];
	return isStartedFor(_sessionId) == false && _session.startTime > 0 && _session.spentWinnersSet == false;
    }


    function setAllTimeSpentWinnersTime(uint256 _sessionId) internal {
	sessions[_sessionId].spentWinnersSet = true;
    }

    function isDailyMintedWinnersAdded(uint256 _sessionId) internal view returns(bool) {
	return block.timestamp < mintedDailyWinnersTime[_sessionId] + (1 days);
    }


    function setDailyMintedWinnersTime(uint256 _sessionId) internal {
	mintedDailyWinnersTime[_sessionId] = block.timestamp + (1 days);
    }
    
    function isAllTimeMintedWinnersAdded(uint256 _sessionId) internal view returns(bool) {
	Session storage _session = sessions[_sessionId];
	return isStartedFor(_sessionId) == false && _session.startTime > 0 && _session.mintedWinnersSet == false;
    }


    function setAllTimeMintedWinnersTime(uint256 _sessionId) internal {
	sessions[_sessionId].mintedWinnersSet = true;
    }

    function calculateTotalRewards(uint256[10] memory _rewards, uint256 _amount) internal returns (uint256) {
	uint256 _totalReward = 0;
	for (uint i=0; i<_amount; i++) {
	    _totalReward = _totalReward.add(_rewards[i]);
	}

	return _totalReward;
    }
}
