// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @notice The Main Smartcontract of the Zombie Farm, the fifth game of the Seascape Network.
 */
interface ZombieFarmInterface {
    function MAX_LEVEL()        external view returns(uint8);
    function lastSessionId()    external view returns(uint256);

    // start time, period, level amount, reward token, speed up fee, repick fee
    function sessions(uint256) external view returns(uint256, uint256, uint8, address, uint256, uint256);

    /// @dev There could be only one challenge category per level.
    /// mapping structure: session -> challenge id = true|false
    function sessionChallenges(uint256, address) external view returns(bool);

    /// @dev Returns the previous challenge for the user.
    /// session id, level id, slot id, user
    /// @return challenge address
    function getPrevChallenge(uint256, uint8, uint8, address) external view returns(address);
}
