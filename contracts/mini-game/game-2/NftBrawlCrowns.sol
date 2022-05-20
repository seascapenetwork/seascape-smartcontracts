pragma solidity 0.6.7;

import "./../../interfaces/CrownsInterface.sol";

/// @notice Nft Rush and Leaderboard contracts both manipulates with Crowns.
/// So, making Crowns available for both Contracts
///
/// @author Medet Ahmetson
contract NftBrawlCrowns {
    CrownsInterface public crowns;

   function setCrowns(address _crowns) internal {
        require(_crowns != address(0), "Crowns can't be zero address");
       	crowns = CrownsInterface(_crowns);
   }
}
