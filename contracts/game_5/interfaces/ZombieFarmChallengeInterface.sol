pragma solidity ^0.6.7;

/**
 * @dev Interface of the Challenge
 */
interface ZombieFarmChallengeInterface {
    function addChallengeToSession(uint256 sessionId, uint8 levelId, bytes calldata data) external;

    function getLevel(uint256 sessionId) external view returns(uint8);

    function isFullyCompleted(uint256 sessionId, address staker) external view returns(bool);
    function isTimeCompleted(uint sessionId, address staker) external view returns(bool);
    function speedUp(uint256 sessionId, address staker) external;

    function stake(uint256 sessionId, address staker, bytes calldata data) payable external;
    function unstake(uint256 sessionId, address staker, bytes calldata data) external;
    function claim(uint256 sessionId, address staker) external;
}
