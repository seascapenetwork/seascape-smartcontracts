// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../interfaces/CrownsInterface.sol";

/// @dev Nft Rush and Leaderboard contracts both are with Crowns.
/// So, making Crowns available for both Contracts by moving it to another contract.
///
/// @author Medet Ahmetson
contract SetCrowns {
    CrownsInterface public crowns;

   function setCrowns(address _crowns) internal {
        require(_crowns != address(0), "Crowns can't be zero address");
       	crowns = CrownsInterface(_crowns);
   }
}
