// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


/// @author Medet Ahmetson
/// @dev This token is deployed for the testing purposes.
/// We use this in order to test the minigames.
contract LpToken is ERC20, Ownable {

    /**
     * @dev Sets the {name} and {symbol} of token.
     * Initializes {decimals} with a default value of 18.
     * Mints all tokens.
     * Transfers ownership to another account. So, the token creator will not be counted as an owner.
     */
    constructor() ERC20("LP CWS Test", "LPT") {
        uint256 supply        = 1e7 * (10 ** 18);
   
        _mint(_msgSender(),       supply);

        transferOwnership(_msgSender());
    }
}
