pragma solidity 0.6.7;

import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";

/// @notice Nft Rush and Leaderboard contracts both manipulates with Crowns.
/// So, making Crowns available for both Contracts
///
/// @author Medet Ahmetson
contract Crowns {
    CrownsToken public crowns;

   function setCrowns(address _crowns) internal {
        require(_crowns != address(0), "Crowns can't be zero address");
       	crowns = CrownsToken(_crowns);	
   }   
}
