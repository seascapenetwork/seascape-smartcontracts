pragma solidity 0.6.7;

import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";

contract Crowns {
    CrownsToken public crowns;

   function setCrowns(address _crowns) internal {
       	crowns = CrownsToken(_crowns);	
   }   
}
