// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @dev Interface of the Challenge
 */
interface ZombieFarmChallengeInterface {
    function addChallengeToSession(uint256 sessionId, uint8 levelId, bytes calldata data) external;

    function getLevel(uint256 sessionId) external view returns(uint8);

    function isFullyCompleted(uint256 sessionId, address staker) external view returns(bool);
    function isTimeCompleted(uint sessionId, address staker) external view returns(bool);
    function speedUp(uint256 sessionId, address staker) external;

    function getStakeAmount(bytes calldata data) external view returns (uint256);
    function getUnstakeAmount(bytes calldata data) external view returns (uint256);
    function getCompletedTime(uint256 sessionId, address staker) external view returns (uint256);

    function stake(uint256 sessionId, address staker, bytes calldata data) external;
    function unstake(uint256 sessionId, address staker, bytes calldata data) external;
    function claim(uint256 sessionId, address staker) external;
}
