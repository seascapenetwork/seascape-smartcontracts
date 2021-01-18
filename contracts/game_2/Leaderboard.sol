pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./GameSession.sol";
import "./Crowns.sol";


/// @title Nft Rush Leaderboard
/// @notice There are four types of leaderboard in the game:
///
/// - all time spenders
/// - top daily spenders
/// - all time minters
/// - top daily minters
/// 
/// @author Medet Ahmetson
contract Leaderboard is Ownable, GameSession, Crowns {
    using SafeMath for uint256;

    struct Announcement {
	bool    spent;               // was all time winners announced
	bool    minted;      
	uint256 dailySpentTime;      // time when last day was announced
	uint256 dailyMintedTime;
    }

    /// @notice tracks whether the game session's all-time
    /// winners were announced or not. And the last time when
    /// daily leaderboards were announced.
    /// @dev be careful, if the daily winners setting doesn't set all 10 winners,
    /// you wouldn't be able to set missed winners in a next round
    mapping(uint256 => Announcement) public announcement;    

    /**
     *  @dev Amounts of CWS that winners will claim.
     *  The values should be set after launching the session
     *  
     *  Example values:
     *
     *  - 1st place gets 100K, 
     *  - 2nd place gets 50K...
     */
    uint256[10] public spentDailyPrizes;        
    uint256[10] public spentAllTimePrizes;
    uint256[10] public mintedDailyPrizes;       
    uint256[10] public mintedAllTimePrizes;
    
    /** 
     *  @notice tracks amount of claimable CWS tokens collected from leaderboards.
     *
     *  Structure:
     *  
     *  - wallet address => prizes sum
     */
    mapping(address => uint256) public spentDailyClaimables;
    mapping(address => uint256) public spentAllTimeClaimables;
    mapping(address => uint256) public mintedDailyClaimables;
    mapping(address => uint256) public mintedAllTimeClaimables;

    
    event Rewarded(address indexed owner, string rewardType, uint256 amount);

    //----------------------------------------------------------------------
    // Pre-game. Following methods executed once before leaderboard begins
    //----------------------------------------------------------------------

    /**
     *  @notice Sets the time when daily rewards should be announced.
     *  So that, daily leaderboard could be announced once for each day.
     *
     *  It also sets the announcement places for alltime leaderboards
     *
     *  NOTE!!! This method should be called from Primary Smartcontract.
     *
     *  @param _sessionId a session Id, that leaderboard is attached to.
     *  @param _startTime the first day of leaderboard, to track daily winners announcement
     */
    function announceLeaderboard(uint256 _sessionId, uint256 _startTime) internal {      
	// this variables are part of leaderboard,
	// therefore located in leaderboard contract
        announcement[_sessionId] = Announcement(false, false, _startTime, _startTime);    
    }


    /**
     *  @notice Sets all leaderboard winners prizes at once.
     *
     *  @param _spentDaily list of prizes for daily top spenders
     *  @param _spentAllTime list of prizes for all time top spenders
     *  @param _mintedDaily list of prizes for daily top minters
     *  @param _mintedAllTime list of prizes for all time top minters
     */
    function setPrizes(uint256[10] memory _spentDaily,
			   uint256[10] memory _spentAllTime,
			   uint256[10] memory _mintedDaily,
			   uint256[10] memory _mintedAllTime) public onlyOwner {
        spentDailyPrizes = _spentDaily;
	spentAllTimePrizes = _spentAllTime;
        mintedDailyPrizes = _mintedDaily;
	mintedAllTimePrizes = _mintedAllTime;       
    }


    //---------------------------------------------------------------------
    // Announcements
    //---------------------------------------------------------------------


    /**
     *  @notice Announce winners list for daily top spenders leaderboard
     *  
     *  @param _sessionId a session of the game
     *  @param _winners list of wallet addresses
     *  @param _winnersAmount number of winners. Some day would not have 10 winners
     *
     *  Requirements:
     *
     *  - Daily spenders leaderboard should be announcable
     *  - `_winnersAmount` must be atmost equal to 10.
     *  - if there are winners, then contract owner should transfer enough CWS to contract to payout players
     */
    function announceDailySpentWinners(uint256 _sessionId,
				  address[10] memory _winners,
				  uint8 _winnersAmount) internal onlyOwner {
        //require(dailySpentWinnersAnnouncable(_sessionId) == true,
        //      "NFT Rush: already set or too early");
        require(_winnersAmount <= 10,
		"NFT Rush: exceeded possible amount of winners");

        if (_winnersAmount > 0) {
	    uint256 _prizeSum = prizeSum(spentDailyPrizes, _winnersAmount);

	    require(crowns.transferFrom(owner(), address(this), _prizeSum) == true,	    
		  "NFT Rush: not enough CWS to give as a reward");	

	    for (uint i=0; i<_winnersAmount; i++) {		
		address _winner = _winners[i];
		
		spentDailyClaimables[_winner] = spentDailyClaimables[_winner]
		    .add(spentDailyPrizes[i]);		
	    }
	}
	
        setDailySpentWinnersTime(_sessionId);
    }


     /**
     *  @notice Announce winners list for all time top spenders leaderboard
     *  
     *  @param _sessionId a session of the game
     *  @param _winners list of wallet addresses
     *  @param _winnersAmount number of winners. Some day would not have 10 winners
     *
     *  Requirements:
     *
     *  - All time spenders leaderboard should be announcable
     *  - `_winnersAmount` must be atmost equal to 10.
     *  - if there are winners, then contract owner should transfer enough CWS to contract to payout players
     */
    function announceAllTimeSpentWinners(uint256 _sessionId,
				  address[10] memory _winners,
				  uint8 _winnersAmount) internal onlyOwner {
        require(allTimeSpentWinnersAnnouncable(_sessionId) == true,
        	      "NFT Rush: all time winners set already or too early to set");
        require(_winnersAmount <= 10,
	      "NFT Rush: exceeded possible amount of winners");

        if (_winnersAmount > 0) {
            uint256 _prizeSum = prizeSum(spentAllTimePrizes, _winnersAmount);

	    require(crowns.transferFrom(owner(), address(this), _prizeSum) == true,
		  "NFT Rush: not enough CWS to give as a reward");

	    for (uint i=0; i<_winnersAmount; i++) {
		address _winner = _winners[i];
		
		spentAllTimeClaimables[_winner] = spentAllTimeClaimables[_winner]
		    .add(spentAllTimePrizes[i]);		
	    }
	}

	setAllTimeSpentWinnersTime(_sessionId);
    }


     /**
     *  @notice Announce winners list for daily top minters leaderboard
     *  
     *  @param _sessionId a session of the game
     *  @param _winners list of wallet addresses
     *  @param _winnersAmount number of winners. Some day would not have 10 winners
     *
     *  Requirements:
     *
     *  - Daily minters leaderboard should be announcable
     *  - `_winnersAmount` must be atmost equal to 10.
     *  - if there are winners, then contract owner should transfer enough CWS to contract to payout players
     */
    function announceDailyMintedWinners(uint256 _sessionId,
				 address[10] memory _winners,
				 uint8 _winnersAmount) internal onlyOwner {
	require(dailyMintedWinnersAnnouncable(_sessionId) == true,
		"NFT Rush: already set or too early");
	require(_winnersAmount <= 10,
		"NFT Rush: too many winners");

	if (_winnersAmount > 0) {
	    uint256 _prizeSum = prizeSum(mintedDailyPrizes, _winnersAmount);

	    require(crowns.transferFrom(owner(), address(this), _prizeSum) == true,
		    "NFT Rush: not enough CWS to give as a reward");

	    for (uint i=0; i<_winnersAmount; i++) {
		address _winner = _winners[i];		

		// increase amount of daily rewards that msg.sender could claim
		mintedDailyClaimables[_winner] = mintedDailyClaimables[_winner]
		    .add(mintedDailyPrizes[i]);
	    }
	}

	setDailyMintedWinnersTime(_sessionId);
    }


     /**
     *  @notice Announce winners list for all time top minters leaderboard
     *  
     *  @param _sessionId a session of the game
     *  @param _winners list of wallet addresses
     *  @param _winnersAmount number of winners. Some day would not have 10 winners
     *
     *  Requirements:
     *
     *  - All time minters leaderboard should be announcable
     *  - `_winnersAmount` must be atmost equal to 10.
     *  - if there are winners, then contract owner should transfer enough CWS to contract to payout players
     */
    function announceAllTimeMintedWinners(uint256 _sessionId,
				     address[10] memory _winners,
				     uint8 _winnersAmount) internal onlyOwner {
	require(allTimeMintedWinnersAnnouncable(_sessionId) == false,
		"NFT Rush: all time winners set already");
	require(_winnersAmount <= 10,
		"NFT Rush: too many winners");

	if (_winnersAmount > 0) {
	    uint256 _prizeSum = prizeSum(mintedAllTimePrizes, _winnersAmount);
	    require(crowns.transferFrom(owner(), address(this), _prizeSum) == true,
		    "NFT Rush: not enough CWS to give as a reward");

	    for (uint i=0; i<_winnersAmount; i++) {
		address _winner = _winners[i];
		
		// increase amount of daily rewards that msg.sender could claim
		mintedAllTimeClaimables[_winner] = mintedAllTimeClaimables[_winner]
		    .add(mintedAllTimePrizes[i]);
	    }
	}

	setAllTimeMintedWinnersTime(_sessionId);
    }


    function announceDailyWinners(uint256 _sessionId,
			 address[10] memory _spentWinners,				  
				  uint8 _spentWinnersAmount,
			 address[10] memory _mintedWinners,				  
				  uint8 _mintedWinnersAmount) public onlyOwner {

	announceDailySpentWinners(_sessionId, _spentWinners, _spentWinnersAmount);
	announceDailyMintedWinners(_sessionId, _mintedWinners, _mintedWinnersAmount);	
    }

    function announceAllTimeWinners(uint256 _sessionId,				      
			 address[10] memory _spentWinners,				  
				  uint8 _spentWinnersAmount,
			 address[10] memory _mintedWinners,				  
				  uint8 _mintedWinnersAmount) public onlyOwner {

	announceAllTimeSpentWinners(_sessionId, _spentWinners, _spentWinnersAmount);
	announceAllTimeMintedWinners(_sessionId, _mintedWinners, _mintedWinnersAmount);	
    }

    //--------------------------------------------------
    // Only game user
    //--------------------------------------------------


    /**
     *  @notice Player can claim leaderboard rewards.
     *
     *  Emits a {Rewarded} event.
     *
     *  Requirements:
     * 
     *  - `spentDailyClaimables` for player should be greater than 0
     *  - transfer of Crowns from contract balance to player must be successful.
     */
    function claimDailySpent() public {
	require(spentDailyClaimables[_msgSender()] > 0,
		"NFT Rush: no claimable CWS for leaderboard");

	uint256 _amount = spentDailyClaimables[_msgSender()];

	require(crowns.transfer(_msgSender(), _amount) == true,
		"NFT Rush: failed to transfer CWS to winner");

	spentDailyClaimables[_msgSender()] = 0;
	
	emit Rewarded(_msgSender(), "DAILY_SPENT", _amount);
    }


     /**
     *  @notice Player can claim leaderboard rewards.
     *
     *  Emits a {Rewarded} event.
     *
     *  Requirements:
     * 
     *  - `spentAllTimeClaimables` for player should be greater than 0
     *  - transfer of Crowns from contract balance to player must be successful.
     */
    function claimAllTimeSpent() public {
	require(spentAllTimeClaimables[_msgSender()] > 0,
		"NFT Rush: no claimable CWS for leaderboard");

	uint256 _amount = spentAllTimeClaimables[_msgSender()];

	require(crowns.transfer(_msgSender(), _amount) == true,
		"NFT Rush: failed to transfer CWS to winner");

	spentAllTimeClaimables[_msgSender()] = 0;
	
	emit Rewarded(_msgSender(), "ALL_TIME_SPENT", _amount);
    }


     /**
     *  @notice Player can claim leaderboard rewards.
     *
     *  Emits a {Rewarded} event.
     *
     *  Requirements:
     * 
     *  - `mintedDailyClaimables` for player should be greater than 0
     *  - transfer of Crowns from contract balance to player must be successful.
     */
    function claimDailyMinted() public {
	require(mintedDailyClaimables[_msgSender()] > 0,
		"NFT Rush: no claimable CWS for leaderboard");

	uint256 _amount = mintedDailyClaimables[_msgSender()];

	require(crowns.transfer(_msgSender(), _amount) == true,
		"NFT Rush: failed to transfer CWS to winner");

	mintedDailyClaimables[_msgSender()] = 0;
	
	emit Rewarded(_msgSender(), "DAILY_MINTED", _amount);
    }


     /**
     *  @notice Player can claim leaderboard rewards.
     *
     *  Emits a {Rewarded} event.
     *
     *  Requirements:
     * 
     *  - `mintedAllTimeClaimables` for player should be greater than 0
     *  - transfer of Crowns from contract balance to player must be successful.
     */
    function claimAllTimeMinted() public {
	require(mintedAllTimeClaimables[_msgSender()] > 0,
		"NFT Rush: no claimable CWS for leaderboard");

	uint256 _amount = mintedAllTimeClaimables[_msgSender()];

	require(crowns.transfer(_msgSender(), _amount) == true,
		"NFT Rush: failed to transfer CWS to winner");

	mintedAllTimeClaimables[_msgSender()] = 0;
	
	emit Rewarded(_msgSender(), "ALL_TIME_MINTED", _amount);
    }

    //--------------------------------------------------
    // Checking announcability of leaderboards
    // It should be announced, when session period for that leaderboard is passed.
    //--------------------------------------------------


    /**
     *  @dev Check whether the winners list is announcable or not.
     *  It is announcable if:
     *
     *  - since last daily winners list announcement passed more than 1 day.
     */
    function dailySpentWinnersAnnouncable(uint256 _sessionId) internal view returns(bool) {
	return block.timestamp < announcement[_sessionId].dailySpentTime.add(1 days);
    }


    /**
     *  @dev Check whether the winners list is announcable or not.
     *  It is announcable if:
     *
     *  - game session is not active anymore
     *  - but game session was once alive.
     *  - and winners list were not announced yet.
     */
    function allTimeSpentWinnersAnnouncable(uint256 _sessionId) internal view returns(bool) {
	Session storage _session = sessions[_sessionId];
	return isActive(_sessionId) == false
	    && _session.startTime > 0
	    && announcement[_sessionId].spent == false;
    }


    /**
     *  @dev Check whether the winners list is announcable or not.
     *  It is announcable if:
     *
     *  - since last daily winners list announcement passed more than 1 day.
     */
    function dailyMintedWinnersAnnouncable(uint256 _sessionId) internal view returns(bool) {
	return block.timestamp < announcement[_sessionId].dailyMintedTime.add(1 days);
    }


    /**
     *  @dev Check whether the winners list is announcable or not.
     *  It is announcable if:
     *
     *  - game session is not active anymore
     *  - but game session was once alive.
     *  - and winners list were not announced yet.
     */
    function allTimeMintedWinnersAnnouncable(uint256 _sessionId) internal view returns(bool) {
	Session storage _session = sessions[_sessionId];
	return isActive(_sessionId) == false
	    && _session.startTime > 0
	    && announcement[_sessionId].minted == false;		    
    }


    //--------------------------------------------------
    // Track announcability. So that each session period (whether it's for day
    // or for whole session) would have one announcement only
    //--------------------------------------------------

    /**
     *  @dev update the timer for tracking daily winner list announcement,
     *  that one more day's winners were announced.
     */
    function setDailySpentWinnersTime(uint256 _sessionId) internal {
	announcement[_sessionId].dailySpentTime = (block.timestamp).add(1 days);
    }


    /**
     *  @dev set flag of all time spenders leaderboard announcement to TRUE
     */
    function setAllTimeSpentWinnersTime(uint256 _sessionId) internal {
	announcement[_sessionId].spent = true;
    }


    /**
     *  @dev update the timer for tracking daily winner list announcement,
     *  that one more day's winners were announced.
     */
    function setDailyMintedWinnersTime(uint256 _sessionId) internal {
	announcement[_sessionId].dailyMintedTime = (block.timestamp).add(1 days);		
    }


    /**
     *  @dev set flag of all time minters leaderboard announcement to TRUE
     */
    function setAllTimeMintedWinnersTime(uint256 _sessionId) internal {
        announcement[_sessionId].minted = true;
    }

    //--------------------------------------------------
    // Interval methods
    //--------------------------------------------------


    /**
     *  @dev Calculates sum of {_winnersAmount} amount of elements in array {_prizes}
     */
    function prizeSum(uint256[10] storage _prizes, uint256 _winnersAmount)
	internal returns (uint256) {
	uint256 _sum = 0;

	for (uint i=0; i<_winnersAmount; i++) {
	    _sum = _sum.add(_prizes[i]);
	}

	return _sum;
    }
}
