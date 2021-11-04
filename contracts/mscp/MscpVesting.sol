pragma solidity 0.6.7;

import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";

/// @title Vesting Contract for moonscape (MSCP) token.
/// @author Nejc Schneider
/// @notice A simple contract to lock specified amount of Crowns (CWS) for a period of time.
/// @dev Based on https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.1.0/contracts/token/ERC20/TokenTimelock.sol
contract VestingContract is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct Balance {
    	uint256 remainingCoins;
    	bool strategicInvestor;
    	/// we dont need locked since remainingCoins default value is 0
    }

    /// "session" data
  	address private currencyAddress;
  	uint private startTime;
    uint private initialAllocation;

    /// CAUTION use multiplier as value will be less then 1
    uint constant releasePerSecond = initialAllocation / 12960000; /// 150 days

    mapping(address=>Balance) balances

    event withdraw (address Receiver, uint withdrawnAmount)
    event startSession (uint startTime

    ///
    function startSession(uint currencyAddress)
        external
        onlyOwner
        returns(uint) //session endtime
    {
        require()
    }

    function addPrivateInvestors (address[] _addresses) external onlyOwner {
        for(uint i; i < _addresses.length; i++){
            require(balances[_address].remainingCoins = 0, "address already has allocation");

            balances[_address].remainingCoins = initialAllocation;
        }
    }
    function addStrategicInvestors (

    function witdrawAvailableCoins () external {
    	 require(hasAllocation(msg.sender), "nothing to withdraw");
       require(now > startTime, "vesting hasnt started yet");
       if(balances[msg.sender].strategicInvestor){
          //ADD formula for strategic
          uint256 timePassed = now - startTime
          uint256 unclaimedPotential = (timePassed * releasePerSecond) / MULTIPLIER; // we need to substract whats already claimed
          uint256 actualUnclaimed = initialAllocation - balances[msg.sender].remainingCoins

       }
    	 else{
          //ADD formula for private
       }

    /// @notice check if investor has any remaining coins
    /// @param _investor address to verify
    /// @return true if there are remaining coins at address
    function hasAllocation(address _investor) public pure returns(bool) {
        return balances[_investor].remainingCoins > 0;
    }

    /// add SelfDestruct function
    /// require(sessionIsFinished)



}
