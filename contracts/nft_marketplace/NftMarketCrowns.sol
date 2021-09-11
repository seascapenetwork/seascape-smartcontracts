pragma solidity 0.6.7;

import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";

/// @dev Nft Rush and Leaderboard contracts both are with Crowns.
/// So, making Crowns available for both Contracts by moving it to another contract.
///
/// @author Medet Ahmetson
contract NftMarketCrowns {
    CrownsToken public crowns;

   function setCrowns(address _crowns) internal {
        require(_crowns != address(0), "Crowns can't be zero address");
       	crowns = CrownsToken(_crowns);
   }
}
