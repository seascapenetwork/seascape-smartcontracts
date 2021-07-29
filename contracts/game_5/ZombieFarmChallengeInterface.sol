pragma solidity ^0.6.7;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface ZombieFarmChallengeInterface {
    /**
     * @dev Returns the validation of reward.
     */
    function isValidData(uint8 offset, bytes calldata data) external view returns(bool);

    function newChallenge(uint32 id, bytes calldata data) external;

    function saveChallenge(uint256 sessionId, uint8 offset, bytes calldata data) external;

    function getIdAndLevel(uint8 offset, bytes calldata data) external view returns(uint32, uint8);

    function reward(uint256 sessionId, uint8 rewardType, address owner) external;
}
