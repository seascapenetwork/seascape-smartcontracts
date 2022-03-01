pragma solidity 0.6.7;

import "./../interfaces/CrownsInterface.sol";

/// @dev Set Crowns.
/// So, making Crowns available for both Contracts by moving it to another contract.
///
/// @author Medet Ahmetson
contract NftBurningCrowns {
    CrownsInterface public crowns;

   function setCrowns(address _crowns) internal {
        require(_crowns != address(0), "Crowns can't be zero address");
       	crowns = CrownsInterface(_crowns);	
   }   
}
