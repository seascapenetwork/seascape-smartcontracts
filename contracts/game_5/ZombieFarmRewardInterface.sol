pragma solidity ^0.6.7;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface ZombieFarmRewardInterface {
    /**
     * @dev Returns the validation of reward.
     */
    function isValidData(byte[] calldata data) external view returns (bool);
}
