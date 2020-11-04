pragma solidity 0.6.7;

import "./openzeppelin/contracts/access/Ownable.sol";
import "./openzeppelin/contracts/math/SafeMath.sol";

contract NFTFactory is Ownable {
    using SafeMath for uint256;

    address private nft;
    
    constructor(address _nft) public {
	nft = _nft;
    }

    //--------------------------------------------------
    // Only Seascape Staking contract
    //--------------------------------------------------
    function mint(address _owner, uint256 _generation) public returns(bool) {
	return true;
    }
    
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------
    function setNFT(address _nft) public onlyOwner {
	nft = _nft;
    }

    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

}


