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
    }
    
    constructor(IERC20 _CWS) public {
	CWS = _CWS;
    }

    mapping(address => Session) public sessions;


    event SessionStarted(address indexed stakingToken, uint256 sessionID);

    
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
	sessions[_tokenAddress] = Session(_sessionID, _totalReward, _period, _startTime, _generation);

	emit SessionStarted(_tokenAddress, _sessionID);
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

    }

    /// @notice Withdraws Earned CWS tokens from staked LP token
    /// of type _token
    function claim(IERC20 _token) external {

    }

    /// @notice Withdraws _amount of LP token
    /// of type _token out of Staking contract.
    function withdraw(IERC20 _token, uint256 _amount) external {

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

    /// @notice Returns amount of Token staked by _address
    function stakedBalanceOf(address _address, uint256 _sessionID) external view returns(uint256) {
	return 0;
    }

    /// @notice Returns amount of CWS Tokens earned by _address
    /// in the _sessionID
    function earned(address _address, uint256 _sessionID) external view returns(uint256) {
	return 0;
    }

    /// @notice Returns amount of CWS Tokens that _address could claim.
    function claimable(address _address, uint256 _sessionID) external view returns(uint256) {
	return 0;
    }

    /// @notice Returns total amount of Staked LP Tokens in a _sessionID
    function stakedBalance(uint256 _sessionID) external view returns(uint256) {
	return 0;
    }
}


