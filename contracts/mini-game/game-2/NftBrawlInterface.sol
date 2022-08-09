// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @notice The list of methods that Manager can call.
/// @author Medet Ahmetson
interface NftBrawlInterface {
    function startSession(address _rewardToken, uint256 _interval, uint256 _period, uint256 _startTime, uint256 _generation) external;

    function setNftFactory(address _address) external;

    function setMinSpendAmount(uint256 _amount) external;
        
    function setMaxSpendAmount(uint256 _amount) external;

    function setPrizes(uint256[10] calldata _spentDaily, uint256[10] calldata _mintedAllTime) external;

    function announceDailySpentWinners(uint256 _sessionId, address[10] calldata _winners, uint8 _winnersAmount, uint256 _fee) external;

    function announceAllTimeMintedWinners(uint256 _sessionId, address[10] calldata _winners, uint8 _winnersAmount, uint256 _fee) external;
}