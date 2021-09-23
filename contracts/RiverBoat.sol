// contracts/Crowns.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.6.7;

import "./openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @author Medet Ahmetson
contract RiverBoat is ERC20 {
    /**
     * @dev Sets the {name} and {symbol} of token.
     * Initializes {decimals} with a default value of 18.
     * Mints all tokens.
     * Transfers ownership to another account. So, the token creator will not be counted as an owner.
     */
    constructor() public ERC20("RiverBoat", "RIB") {
        uint256 supply        = 1000000000000000000000;
   
        _mint(msg.sender,       supply);
    }
}
