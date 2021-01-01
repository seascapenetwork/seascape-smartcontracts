pragma solidity 0.6.7;

import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../seascape_nft/NftTypes.sol";
import "./../seascape_nft/NftFactory.sol";

contract GameSession is Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;
    using NftTypes for NftTypes;

    Counters.Counter private sessionId;

    CrownsToken public crowns;

    /// @notice Game session. Smartcontract is active during the game session.
    /// Game session is active for a certain period of time only
    struct Session {
	uint256 interval;      // period between intervals
	uint256 period;        // duration of session
	uint256 startTime;     // unix timestamp when session starts
	uint256 generation;    // nft generation
    }

    uint256 public lastSessionId;
    mapping(uint256 => Session) public sessions;

    event SessionStarted(uint256 id, uint256 startTime, uint256 endTime, uint256 generation);
	
    constructor() public {
	// Starts at value 1. 
	sessionId.increment();
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
    function _startSession(uint256 _interval, uint256 _period, uint256 _startTime, uint256 _generation) internal onlyOwner returns(uint256) {

	uint256 _sessionId = sessionId.current();

	sessions[_sessionId] = Session(_interval, _period, _startTime, _generation);

	sessionId.increment();
	lastSessionId = _sessionId;

	return _sessionId;
    }

    //--------------------------------------------------
    // Private methods
    //--------------------------------------------------

    
    function isStartedFor(uint256 _sessionId) internal view returns(bool) {
	if (now > sessions[_sessionId].startTime + sessions[_sessionId].period) {
	    return false;
	}

	return true;
    }
}
