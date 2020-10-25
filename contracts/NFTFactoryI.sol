pragma solidity 0.6.7;

contract NFTFactory {

    //--------------------------------------------------
    // Only Seascape Staking contract
    //--------------------------------------------------
 
    function mint(address _owner, uint256 _generation) public returns(bool);
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------


    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

    function balanceOfClaimables(address _owner) public view returns(uint256);
}





