// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./NftBrawlGameSession.sol";
//import "./NftBrawlCrowns.sol";

/// @notice There are four types of leaderboards in the game:
///
/// - all time spenders
/// - top daily minters
///
/// @author Medet Ahmetson
contract Leaderboard is Ownable, GameSession { //, Crowns {
    struct Announcement {
        bool    minted;             // was all time winners announced
        uint256 dailySpentTime;     // time when last day was announced
    }

    /// @notice tracks whether the game session's all-time
    /// winners were announced or not. And the last time when
    /// daily leaderboards were announced.
    /// @dev be careful, if the daily winners setting doesn't set all 10 winners,
    /// you wouldn't be able to set missed winners when settings next day winners.
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
    uint256[10] public mintedAllTimePrizes;

    /**
     *  @notice tracks amount of claimable CWS tokens collected from leaderboards.
     *
     *  Structure:
     *
     *  - wallet address => token address => prizes sum
     */
    mapping(address => mapping(address => uint256)) public spentDailyClaimables;
    mapping(address => mapping(address => uint256)) public mintedAllTimeClaimables;


    event Rewarded(address indexed owner, string rewardType, uint256 amount);
    event PrizeSet(uint256[10] _spentDaily, uint256[10] _mintedAllTime);
    event AnnounceDailyWinners(uint256 indexed sessionId, address[10] spentWinners);
    event AnnounceAllTimeWinners(uint256 indexed sessionId, address[10] mintedWinners);
    event Received(address sender, uint256 amount);

    //----------------------------------------------------------------------
    // Pre-game. Following methods executed once before game session begins
    //----------------------------------------------------------------------

    /**
     *  @notice Starts a leaderboard for the game session. This method
     *  should be invoked, once when game session started. otherwise,
     *  would be impossible to track winners for the new session.
     *  @dev it sets the start time of the leaderboard,
     *  So that, daily leaderboard could be announced once for each day.
     *
     *  NOTE!!! This method should be called from Primary Smartcontract.
     *
     *  @param _sessionId a session Id, that leaderboard is attached to.
     *  @param _startTime the first day of leaderboard, to track daily winners announcement
     */
    function announceLeaderboard(uint256 _sessionId, uint256 _startTime) internal {
        // this variables are part of leaderboard,
        // therefore located in leaderboard contract
        announcement[_sessionId] = Announcement(false, _startTime);
    }


    /**
     *  @notice Sets all prizes at once. Prizes in CWS token that winners would get.
     *
     *  @param _spentDaily list of prizes for daily top spenders
     *  @param _mintedAllTime list of prizes for all time top minters
     */
    function setPrizes(uint256[10] calldata _spentDaily, uint256[10] calldata _mintedAllTime) external onlyOwner {
        spentDailyPrizes = _spentDaily;
        mintedAllTimePrizes = _mintedAllTime;

        emit PrizeSet(_spentDaily, _mintedAllTime);
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
    function announceDailySpentWinners(uint256 _sessionId, address[10] calldata _winners, uint8 _winnersAmount) external onlyOwner payable {
        require(dailySpentWinnersAnnouncable(_sessionId), "NFT Rush: already set or too early");
        require(_winnersAmount <= 10, "NFT Rush: exceeded possible amount of winners");

        if (_winnersAmount > 0) {
            Session storage _session = sessions[_sessionId];

            uint256 _prizeSum = prizeSum(spentDailyPrizes, _winnersAmount);

            if(_session.rewardToken == address(0x0)) {
                require(msg.value >= _prizeSum, "NFT Rush: not enough native token to give as a reward");
            } else {
                IERC20 _reward = IERC20(_session.rewardToken);
                require(_reward.transferFrom(owner(), address(this), _prizeSum), "NFT Rush: not enough tokens to give as a reward");
            }

            for (uint i=0; i<_winnersAmount; i++) {
                address _winner = _winners[i];

                spentDailyClaimables[_winner][_session.rewardToken] = spentDailyClaimables[_winner][_session.rewardToken] + spentDailyPrizes[i];
            }
        }

        setDailySpentWinnersTime(_sessionId);
        emit AnnounceDailyWinners(_sessionId, _winners);
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
    function announceAllTimeMintedWinners(uint256 _sessionId, address[10] calldata _winners, uint8 _winnersAmount) external onlyOwner payable {
        require(allTimeMintedWinnersAnnouncable(_sessionId), "NFT Rush: all time winners set already");
        require(_winnersAmount <= 10, "NFT Rush: too many winners");

        if (_winnersAmount > 0) {
            Session storage _session = sessions[_sessionId];

            uint256 _prizeSum = prizeSum(mintedAllTimePrizes, _winnersAmount);

            if(_session.rewardToken == address(0x0)) {
                require(msg.value >= _prizeSum, "NFT Rush: not enough native token to give as a reward");
            } else {
                IERC20 _reward = IERC20(_session.rewardToken);
                require(_reward.transferFrom(owner(), address(this), _prizeSum), "NFT Rush: not enough tokens to give as a reward");
            }

            for (uint i=0; i<_winnersAmount; i++) {
                address _winner = _winners[i];

                // increase amount of daily rewards that msg.sender could claim
                mintedAllTimeClaimables[_winner][_session.rewardToken] = mintedAllTimeClaimables[_winner][_session.rewardToken] + mintedAllTimePrizes[i];
            }
        }

        setAllTimeMintedWinnersTime(_sessionId);

        emit AnnounceAllTimeWinners(_sessionId, _winners);
    }


    //--------------------------------------------------
    // Player's methods to claim leaderboard prizes
    //--------------------------------------------------


    /**
     *  @notice Player can claim leaderboard rewards.
     *
     *  @param _sessionId a session of the game
     *
     *  Emits a {Rewarded} event.
     *
     *  Requirements:
     *
     *  - `spentDailyClaimables` for player should be greater than 0
     *  - transfer of Crowns from contract balance to player must be successful.
     */
    function claimDailySpent(uint256 _sessionId) external {
        Session storage _session = sessions[_sessionId];

        require(spentDailyClaimables[_msgSender()][_session.rewardToken] > 0, "NFT Rush: no claimable CWS for leaderboard");

        uint256 _amount = spentDailyClaimables[_msgSender()][_session.rewardToken];

        _safeTransfer(_session.rewardToken, _msgSender(), _amount);

        spentDailyClaimables[_msgSender()][_session.rewardToken] = 0;

        emit Rewarded(_msgSender(), "DAILY_SPENT", _amount);
    }

    /**
     *  @notice Player can claim leaderboard rewards.
     *
     *  @param _sessionId a session of the game
     *
     *  Emits a {Rewarded} event.
     *
     *  Requirements:
     *
     *  - `mintedAllTimeClaimables` for player should be greater than 0
     *  - transfer of Crowns from contract balance to player must be successful.
     */
    function claimAllTimeMinted(uint256 _sessionId) external {
        Session storage _session = sessions[_sessionId];

        require(mintedAllTimeClaimables[_msgSender()][_session.rewardToken] > 0, "NFT Rush: no claimable CWS for leaderboard");

        uint256 _amount = mintedAllTimeClaimables[_msgSender()][_session.rewardToken];

        _safeTransfer(_session.rewardToken, _msgSender(), _amount);

        mintedAllTimeClaimables[_msgSender()][_session.rewardToken] = 0;

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
        Session storage _session = sessions[_sessionId];

        uint256 dayAfterSession = _session.startTime + _session.period + 1 days;

        uint256 today = announcement[_sessionId].dailySpentTime + 1 days;

        // time should be 24 hours later than last announcement.
        // as we announce leaders for the previous 24 hours.
        //
        // time should be no more than 1 day after session end,
        // so we could annnounce leaders for the last day of session.
        // remember, we always announce after 24 hours pass since the last session.
        return block.timestamp > today && today < dayAfterSession;
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
        return !isActive(_sessionId)
            && _session.startTime > 0
            && !announcement[_sessionId].minted;
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
        announcement[_sessionId].dailySpentTime = announcement[_sessionId].dailySpentTime + 1 days;
    }

    /**
     *  @dev set flag of all time minters leaderboard announcement to TRUE
     */
    function setAllTimeMintedWinnersTime(uint256 _sessionId) internal {
        announcement[_sessionId].minted = true;
    }

    //--------------------------------------------------
    // Internal methods used by other methods as a utility.
    //--------------------------------------------------

    /**
     *  @dev Calculates sum of {_winnersAmount} amount of elements in array {_prizes}
     */
    function prizeSum(uint256[10] storage _prizes, uint256 _winnersAmount) internal view returns (uint256) {
        uint256 _sum = 0;

        for (uint i=0; i<_winnersAmount; i++) {
            _sum += _prizes[i];
        }

        return _sum;
    }

    function _safeTransfer(address _token, address _to, uint256 _amount) internal {
        if (_token != address(0)) {
            IERC20 _rewardToken = IERC20(_token);

            uint256 _balance = _rewardToken.balanceOf(address(this));
            if (_amount > _balance) {
                _rewardToken.transfer(_to, _balance);
            } else {
                _rewardToken.transfer(_to, _amount);
            }
        } else {
            uint256 _balance = address(this).balance;
            if (_amount > _balance) {
                payable(_to).transfer(_balance);
            } else {
                payable(_to).transfer(_amount);
            }
        }
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
