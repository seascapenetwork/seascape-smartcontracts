pragma solidity 0.6.7;

import "./openzeppelin/contracts/access/Ownable.sol";
import "./openzeppelin/contracts/math/SafeMath.sol";

contract NFTFactory is Ownable {
    using SafeMath for uint256;


    //--------------------------------------------------
    // Only Seascape Staking contract
    //--------------------------------------------------
    function mint(address _owner, uint256 _generation) public returns(bool) {
	return true;
    }
    
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------


    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

}


