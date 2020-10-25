pragma solidity 0.6.7;

import "./openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./openzeppelin/contracts/access/Ownable.sol";
import "./openzeppelin/contracts/utils/Counters.sol";

contract Staking is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    IERC20 public CWS;

    Counters.Counter private sessionID;
    
    struct Session {
	uint256 id;
        uint256 totalReward;
	uint256 period;
	uint256 startTime;
	uint256 generation;
	uint256 distributed;
    }

    struct Balance {
	uint256 amount;
	uint256 claimed;
	uint256 startTime;
	uint256 sessionID;
    }

    constructor(IERC20 _CWS) public {
	CWS = _CWS;
    }

    mapping(address => Session) public sessions;
    mapping(address => mapping(address => Balance)) public balances;

    event SessionStarted(address indexed stakingToken, uint256 sessionID, uint256 reward, uint256 startTime, uint256 endTime, uint256 generation);
    event Deposited(address indexed stakingToken, address indexed owner, uint256 sessionID, uint256 amount, uint256 startTime);
    event Claimed(address indexed stakingToken, address indexed owner, uint256 sessionID, uint256 amount, uint256 startTime);
    event Withdrawn(address indexed stakingToken, address indexed owner, uint256 sessionID, uint256 amount, uint256 startTime);
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------

    /// @notice Withdraws CWS tokens used outside of Crowns
    function withdrawCWS() external onlyOwner {
    }

    /// @notice Starts a staking session for a finit _period of
    /// time, starting from _startTime. The _totalReward of
    /// CWS tokens will be distributed in every block. It allows to claim a
    /// a _generation Seascape NFT.
    function startSession(IERC20 _stakingToken,
			  uint256 _totalReward,
			  uint256 _period,
			  uint256 _startTime,
			  uint256 _generation) external onlyOwner {
	// event for the staking token should not be started before.
	address _tokenAddress = address(_stakingToken);
	require(isStartedFor(_tokenAddress) == false, "Seascape Staking: Session is started");
	
        Counters.increment(sessionID);
	uint256 _sessionID = Counters.current(sessionID);
	sessions[_tokenAddress] = Session(_sessionID, _totalReward, _period, _startTime, _generation, 0);

	emit SessionStarted(_tokenAddress, _sessionID, _totalReward, _startTime, _startTime + _period, _generation);
    }
 

    function isStartedFor(address _stakingToken) internal view returns(bool) {
	if (sessions[_stakingToken].id == 0) {
	    return false;
	}

	if (now > sessions[_stakingToken].startTime + sessions[_stakingToken].period) {
	    return false;
	}

	return true;
    }
    
    
    /// @notice Sets a NFT factory that will mint a token for stakers
    function setNFTFactory(address _address) external onlyOwner {

    }


    //--------------------------------------------------
    // Only staker
    //--------------------------------------------------

    /// @notice Deposits _amount of LP token
    /// of type _token into Staking contract.
    function deposit(IERC20 _token, uint256 _amount) external {
	require(_amount > 0, "Seascape Staking: Amount to deposit should be greater than 0");

	// Should calculate the tokens if any exist at update balances.calculated
	// Should check that session for _token is still active
	
	address _tokenAddress = address(_token);
	address _owner = msg.sender;
	uint256 _sessionID = sessions[_tokenAddress].id;
	uint256 _claimed = 0;
	
	if (balances[_tokenAddress][_owner].amount > 0) {
	    claim(_token);
	    _claimed = balances[_tokenAddress][_owner].claimed;
	    _amount = _amount.add(balances[_tokenAddress][_owner].amount);
	}
	
	balances[_tokenAddress][_owner] = Balance(_amount, _claimed, now, _sessionID);
       
        emit Deposited(_tokenAddress, _owner, _sessionID, _amount, now);
    }

    /// @notice Withdraws Earned CWS tokens from staked LP token
    /// of type _token
    function claim(IERC20 _token) public {
        address _tokenAddress = address(_token);
	address _owner = msg.sender;

	require(balances[_tokenAddress][_owner].amount > 0, "Seascape Staking: No LP Staking tokens to claim");
	//require(sessions[_tokenAddress].totalReward > sessions[_tokenAddress].distributed, "Seascape Staking: No more tokens left to distribute");

	uint256 _interest = calculateInterest(_tokenAddress, _owner);

	sessions[_tokenAddress].distributed = sessions[_tokenAddress].distributed.add(_interest);

	balances[_tokenAddress][_owner].claimed = balances[_tokenAddress][_owner].claimed.add(_interest);

	emit Claimed(_tokenAddress, _owner, sessions[_tokenAddress].id,  _interest, now);
    }

    function calculateInterest(address _tokenAddress, address _owner) internal view returns(uint256) {
	// total intereset/per second
	uint256 _interest = sessions[_tokenAddress].totalReward.div(sessions[_tokenAddress].period);

	uint256 _currentTime = now;
	uint256 _depositTime = _currentTime.sub(balances[_tokenAddress][_owner].startTime);
	uint256 _claimed = balances[_tokenAddress][_owner].claimed;
	
	// (return per second * balances.startTime) - balances.claimed
	return _interest.mul(_depositTime).sub(_claimed);
    }
    
    /// @notice Withdraws _amount of LP token
    /// of type _token out of Staking contract.
    function withdraw(IERC20 _token, uint256 _amount) external {
	address _tokenAddress = address(_token);
	address _owner = msg.sender;

	claim(_token);

	balances[_tokenAddress][_owner].amount = balances[_tokenAddress][_owner].amount.sub(_amount);

	emit Withdrawn(_tokenAddress, _owner, sessions[_tokenAddress].id, _amount, now);
    }

    /// @notice Mints an NFT for staker. One NFT per session, per token.
    function claimNFT(IERC20 _token, uint256 _sessionID) external {

    }


    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

    /// @notice Returns last session info by a _token for staking
    function sessionFor(IERC20 _token) external view returns(uint256) {
        address _tokenAddress = address(_token);
	return sessions[_tokenAddress].id;
    }

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
	return sessions[_tokenAddress].totalReward;
    }
}


