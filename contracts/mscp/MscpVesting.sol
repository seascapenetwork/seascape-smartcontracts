pragma solidity 0.6.7;

import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";

/// @title Vesting Contract for moonscape (MSCP) token.
/// @author Nejc Schneider
/// @notice Release set amount of tokens (per address) over for a specified period of time.
contract VestingContract is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// "session" data
  	address public currencyAddress;
  	uint public startTime;

    // constant variables
    uint256 constant private MULTIPLIER = 10**18;
    /// @dev total tokens to be released gradualy (without "day one" tokens)
    uint256 constant private TOTAL_PRIVATE = 8500000;
    uint256 constant private TOTAL_STRATEGIC = 8000000;
    /// @dev TPS = Tokens Per Second
    uint256 constant private TPS_PRIVATE = MULTIPLIER * TOTAL_PRIVATE / 25920000;     /// 300 days
    uint256 constant private TPS_STRATEGIC = MULTIPLIER * TOTAL_STRATEGIC / 12960000; /// 150 days

    struct Balance {
        uint256 remainingCoins;
    	  bool strategicInvestor;
        bool claimedBonus;      // true if "day one" tokens were claimed
    }

    mapping(address=>Balance) balances;

    event Withdraw (address indexed Receiver, uint256 withdrawnAmount);

    constructor (address _currencyAddress, uint256 _startTime) public {
        require(_currencyAddress != address(0), "invalid currency address");
        require(_startTime > now, "start time should be in future");

        currencyAddress = _currencyAddress;
        startTime = _startTime;
    }

    /// @notice add strategic investor address
    function addStrategicInvestor (address _investor) external onlyOwner {
      require(balances[_investor].remainingCoins == 0, "investor already has allocation");
        balances[_investor].remainingCoins = TOTAL_STRATEGIC;
    }

    function addPrivateInvestor (address _investor) external onlyOwner {
        require(balances[_investor].remainingCoins == 0, "investor already has allocation");
        balances[_investor].remainingCoins = TOTAL_PRIVATE;
    }

    /// @notice clam the unlocked tokens
    function withdraw () external {
        require(hasAllocation(msg.sender), "nothing to withdraw");
        require(now > startTime, "vesting hasnt started yet");

        Balance storage balance = balances[msg.sender];
        uint256 timePassed = now - startTime;
        uint256 actualUnclaimed;
        if(balance.strategicInvestor){
            uint256 unclaimedPotential = (timePassed * TPS_STRATEGIC) / MULTIPLIER;
            actualUnclaimed = unclaimedPotential - (TOTAL_STRATEGIC - balance.remainingCoins);
            balance.remainingCoins = balance.remainingCoins.sub(actualUnclaimed);
            if(!balance.claimedBonus) {
                balance.claimedBonus = true;
                actualUnclaimed = actualUnclaimed + 2000000; // 2 mil is released on day one
            }
        } else {
            uint256 unclaimedPotential = (timePassed * TPS_PRIVATE) / MULTIPLIER;
            actualUnclaimed = unclaimedPotential - (TOTAL_PRIVATE - balance.remainingCoins);
            balance.remainingCoins = balance.remainingCoins.sub(actualUnclaimed);
            if(!balance.claimedBonus) {
                balance.claimedBonus = true;
                actualUnclaimed = actualUnclaimed + 1500000; // 1.5 mil is released on day one
            }
        }
        IERC20(currencyAddress).safeTransfer(msg.sender, actualUnclaimed);
        emit Withdraw(msg.sender, actualUnclaimed);
    }

    /// @notice check if investor has any remaining coins
    /// @param _investor address to verify
    /// @return true if there are remaining coins at address
    function hasAllocation(address _investor) public view returns(bool) {
        return balances[_investor].remainingCoins > 0;
    }
}
