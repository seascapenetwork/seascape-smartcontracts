pragma solidity 0.6.7;

//declare imports
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";

import "./interfaces/ZombieFarmRewardInterface.sol";
import "./interfaces/ZombieFarmChallengeInterface.sol";

/**
 * @notice The Main Smartcontract of the Zombie Farm, the fifth game of the Seascape Network.
 */
interface ZombieFarmRewardInterface {
    function MAX_LEVEL()        external view returns(uint8);
    function MAX_CHALLENGES()   external view returns(uint8);          // Max possible challenges
    function lastSessionId()    external view returns(uint256);

    // start time, end time, level amount, reward token, speed up fee, repick fee
    function sessions(uint256) external view returns(uint256, uint256, uint8, address, uint256, uint256);

    /// @dev There could be only one challenge category per level.
    /// mapping structure: session -> challenge id = true|false
    function sessionChallenges(uint256, address) external view returns(bool)
}
