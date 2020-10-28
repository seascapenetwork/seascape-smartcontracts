pragma solidity 0.6.7;

import "./openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./openzeppelin/contracts/access/Ownable.sol";
import "./openzeppelin/contracts/math/SafeMath.sol";
import "./NFTFactory.sol";

contract Staking is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    NFTFactory nftFactory;
    
    IERC20 public CWS;

    /// @dev Total amount of Crowns stored for all sessions
    uint256 rewardBalance = 0;
    
    struct Session {
        uint256 totalReward;
	uint256 period;
	uint256 startTime;
	uint256 generation;
	uint256 claimed;
	uint256 amount;
	uint256 rewardUnit;     // Reward per second = totalReward/period
    }

    struct Balance {
	uint256 amount;
	uint256 claimed;
	uint256 startTime;
	bool minted;
    }

    constructor(IERC20 _CWS) public {
	CWS = _CWS;
    }

    mapping(address => Session) public sessions;
    mapping(address => mapping(address => Balance)) public balances;
    mapping(address => mapping(address => uint)) public depositTime;

    event SessionStarted(address indexed stakingToken, uint256 reward, uint256 startTime, uint256 endTime, uint256 generation);
    event Deposited(address indexed stakingToken, address indexed owner, uint256 amount, uint256 startTime, uint256 totalStaked);
    event Claimed(address indexed stakingToken, address indexed owner, uint256 amount, uint256 startTime);
    event Withdrawn(address indexed stakingToken, address indexed owner, uint256 amount, uint256 startTime, uint256 totalStaked);
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------

    /// @notice Withdraws CWS tokens used outside of Crowns
    function withdrawCWS(address _tokenAddress) external onlyOwner {
	require(sessions[_tokenAddress].totalReward > 0, "Seascape Staking: No session was registered");
	require(isStartedFor(_tokenAddress) == false,    "Seascape Staking: Session should end before claiming");

	uint256 remained = sessions[_tokenAddress].totalReward.sub(sessions[_tokenAddress].claimed);
	require(remained > 0,                            "Seascape Staking: No tokens to withdraw back");

	CWS.safeTransferFrom(address(this), owner(), remained);

	// Prevent from double distribution
	sessions[_tokenAddress].claimed = sessions[_tokenAddress].totalReward;

	rewardBalance = rewardBalance.sub(remained);
    }

    /// @notice Starts a staking session for a finit _period of
    /// time, starting from _startTime. The _totalReward of
    /// CWS tokens will be distributed in every second. It allows to claim a
    /// a _generation Seascape NFT.
    function startSession(address _tokenAddress,
			  uint256 _totalReward,
			  uint256 _period,
			  uint256 _startTime,
			  uint256 _generation) external onlyOwner {

	require(_tokenAddress != address(0),          "Seascape Staking: Staking token should not be equal to 0");
	require(isStartedFor(_tokenAddress) == false, "Seascape Staking: Session is started");
	require(_startTime > now,                     "Seascape Staking: Seassion should start in the future");
	require(_period > 0,                          "Seascape Staking: Lasting period of session should be greater than 0");
	require(_totalReward > 0,                     "Seascape Staking: Total reward of tokens to share should be greater than 0");

	uint256 newRewardBalance = rewardBalance.add(_totalReward);
	// Amount of tokens to reward should be in the balance already
	require(CWS.balanceOf(address(this)) >= newRewardBalance, "Seascape Staking: Not enough balance of Crowns for reward");

	uint256 _rewardUnit = _totalReward.div(_period);
	
	sessions[_tokenAddress] = Session(_totalReward, _period, _startTime, _generation, 0, 0, _rewardUnit);
	
	rewardBalance = newRewardBalance;

	emit SessionStarted(_tokenAddress, _totalReward, _startTime, _startTime + _period, _generation);
    }
 

    function isStartedFor(address _stakingToken) internal view returns(bool) {
	if (sessions[_stakingToken].totalReward == 0) {
	    return false;
	}

	if (now > sessions[_stakingToken].startTime + sessions[_stakingToken].period) {
	    return false;
	}

	return true;
    }
    
    
    /// @notice Sets a NFT factory that will mint a token for stakers
    function setNFTFactory(address _address) external onlyOwner {
	nftFactory = NFTFactory(_address);
    }


    //--------------------------------------------------
    // Only staker
    //--------------------------------------------------

    /// @notice Deposits _amount of LP token
    /// of type _token into Staking contract.
    function deposit(IERC20 _token, uint256 _amount) external {
	require(_amount > 0, "Seascape Staking: Amount to deposit should be greater than 0");
	address _tokenAddress     = address(_token);
	require(isStartedFor(_tokenAddress), "Seascape Staking: Session is not active");
	require(_token.balanceOf(msg.sender) >= _amount, "Seascape Staking: Not enough LP tokens to deposit");
	require(_token.transfer(address(this), _amount) == true, "Seascape Staking: Failed to transfer LP tokens into contract");

	Session storage _session  = sessions[_tokenAddress];
	Balance storage _balance  = balances[_tokenAddress][msg.sender];
	uint _depositTime = depositTime[_tokenAddress][msg.sender];


	bool _minted             = false;
	if (_depositTime > _session.startTime) {
	    _minted = _balance.minted;
	}
		
	if (_balance.amount > 0) {
	    claim(_tokenAddress);
	    _balance.amount = _amount.add(_balance.amount);
	    _balance.minted = _minted;
	} else {
	    // If user withdrew all LP tokens, but deposited before for the session
	    // Means, that player still can't mint more token anymore.
            balances[_tokenAddress][msg.sender] = Balance(_amount, 0, block.timestamp, _minted);
	}
	
	_session.amount                           = _session.amount.add(_amount);
	depositTime[_tokenAddress][msg.sender]    = block.timestamp;
       
        emit Deposited(_tokenAddress, msg.sender, _amount, block.timestamp, _session.amount);
    }

    /// @notice Withdraws Earned CWS tokens from staked LP token
    /// of type _token
    function claim(address _tokenAddress) public {
	Session storage _session = sessions[_tokenAddress];
	Balance storage _balance = balances[_tokenAddress][msg.sender];

	require(_balance.amount > 0, "Seascape Staking: No deposit was found");

	uint256 _interest = calculateInterest(_tokenAddress, msg.sender);

	_session.claimed = _session.claimed.add(_interest);
	_balance.claimed = _balance.claimed.add(_interest);

	emit Claimed(_tokenAddress, msg.sender, _interest, block.timestamp);
    }

    function calculateInterest(address _tokenAddress, address _owner) internal view returns(uint256) {
	Session storage _session = sessions[_tokenAddress];
	Balance storage _balance = balances[_tokenAddress][_owner];

	// How much of total deposit is belong to player as a floating number
	uint256 _portion = _balance.amount.div(_session.amount);
	
       	uint256 _interest = _session.rewardUnit.mul(_portion);

	// _balance.startTime is misleading.
	// Because, it's updated in every deposit time or claim time.
	uint256 _earnPeriod = block.timestamp.sub(_balance.startTime);
	
	return _interest.mul(_earnPeriod).sub(_balance.claimed);
    }
    
    /// @notice Withdraws _amount of LP token
    /// of type _token out of Staking contract.
    function withdraw(IERC20 _token, uint256 _amount) external {
	address _tokenAddress     = address(_token);
	Balance storage _balance  = balances[_tokenAddress][msg.sender];

	require(_balance.amount >= _amount, "Seascape Staking: Exceeds the balance that user has");

	claim(_tokenAddress);

	require(_token.transferFrom(address(this), msg.sender, _amount) == true, "Seascape Staking: Failed to transfer token from contract to user");
	
	_balance.amount = _balance.amount.sub(_amount);
	sessions[_tokenAddress].amount = sessions[_tokenAddress].amount.sub(_amount);

	emit Withdrawn(_tokenAddress, msg.sender, _amount, block.timestamp, sessions[_tokenAddress].amount);
    }

    /// @notice Mints an NFT for staker. One NFT per session, per token.
    function claimNFT(address _tokenAddress) external {
	require(isStartedFor(_tokenAddress), "Seascape Staking: No active session");
	require(balances[_tokenAddress][msg.sender].minted == false, "Seascape Staking: Already minted");

	if (nftFactory.mint(msg.sender, sessions[_tokenAddress].generation)) {
	    balances[_tokenAddress][msg.sender].minted = true;
	}
    }


    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

    /// @notice Returns amount of Token staked by _owner
    function stakedBalanceOf(address _tokenAddress, address _owner) external view returns(uint256) {
	return balances[_tokenAddress][_owner].amount;
    }

    /// @notice Returns amount of CWS Tokens earned by _address
    function earned(address _tokenAddress, address _owner) external view returns(uint256) {
	uint256 _interest = calculateInterest(_tokenAddress, _owner);
	return balances[_tokenAddress][_owner].claimed.add(_interest);
    }

    /// @notice Returns amount of CWS Tokens that _address could claim.
    function claimable(address _tokenAddress, address _owner) external view returns(uint256) {
	return calculateInterest(_tokenAddress, _owner);
    }

    /// @notice Returns total amount of Staked LP Tokens
    function stakedBalance(address _tokenAddress) external view returns(uint256) {
	return sessions[_tokenAddress].amount;
    }
}


