pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";

/// @notice Nft Rush and Leaderboard contracts both requires Game Session data
/// So, making Game Session separated.
///
/// Game session indicates activity of Game for certain period of time.
///
/// @author Medet Ahmetson
contract GameSession is Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private sessionId;

    struct Session {
	uint256 interval;      // period between intervals
	uint256 period;        // duration of session
	uint256 startTime;     // unix timestamp when session starts
	uint256 generation;    // nft generation
    }

    /// @notice Game session. Smartcontract is active during the game session.
    /// Game session is active for a certain period of time only
    mapping(uint256 => Session) public sessions;

    event SessionStarted(uint256 id, uint256 startTime, uint256 endTime, uint256 generation);
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------
    
    /**
     *  @notice Starts a staking session for a finit _period of
     *  time, starting from _startTime. The _totalReward of
     *  CWS tokens will be distributed in every second. It allows to claim a
     *  a _generation Seascape NFT.
     *
     *  Emits a {SessionStarted} event.
     *
     *  @param _interval duration between claims
     *  @param _period session duration
     *  @param _startTime session start time in unix timestamp
     *  @param _generation Seascape Nft generation that is given as a reward
     */
    function _startSession(uint256 _interval, uint256 _period, uint256 _startTime, uint256 _generation) internal onlyOwner returns(uint256) {

	sessionId.increment();		
	uint256 _sessionId = sessionId.current();
	
	sessions[_sessionId] = Session(_interval, _period, _startTime, _generation);

	emit SessionStarted(_sessionId, _startTime, _startTime.add(_period), _generation);
	
	return _sessionId;
    }

    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------


    /**
     *  @notice Whether the given session is active or not
     */
    function isActive(uint256 _sessionId) public view returns(bool) {
	if (now > sessions[_sessionId].startTime + sessions[_sessionId].period) {
	    return false;
	}

	return true;
    }


    /**
     * @notice The last created session's id
     *
     * NOTE!!! It returns 0, if no session was started yet.
     */
    function lastSessionId() public view returns(uint256) {
	return sessionId.current();
    }
}
