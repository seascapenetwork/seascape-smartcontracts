pragma solidity ^0.6.7;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface ZombieFarmChallengeInterface {
    /**
     * @dev Returns the validation of reward.
     */
    function newChallenge(uint32 id, bytes calldata data) external;

    function saveChallenge(uint256 sessionId, uint256 startTime, uint256 period, uint8 offset, bytes calldata data) external;

    function getIdAndLevel(uint8 offset, bytes calldata data) external view returns(uint32, uint8);

    function getLevel(uint256 sessionId, uint32 challengeId) external view returns(uint8);

    function stake(uint256 sessionId, uint32 challengeId, address staker, bytes calldata data) external;
    function unstake(uint256 sessionId, uint32 challengeId, address staker, bytes calldata data) external;
    function claim(uint256 sessionId, uint32 challengeId, address staker, bytes calldata data) external;
}
