pragma solidity ^0.6.7;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface ZombieFarmRewardInterface {
    /**
     * @dev Returns the validation of reward.
     */
    function isValidData(bytes calldata data) external view returns (bool);

    function saveReward(uint256 sessionId, uint8 rewardType, bytes calldata data) external;
    function saveRewards(uint256 sessionId, uint8 rewardAmount, bytes calldata data) external;

    function reward(uint256 sessionId, uint8 rewardType, address owner) external;

    function getLevel(uint8 offset, bytes calldata data) external view returns(uint8);
}
