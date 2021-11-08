pragma solidity 0.6.7;

import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";

/// @title Vesting Contract for moonscape (MSCP) token.
/// @author Nejc Schneider
/// @notice Release set amount of tokens (per address) over for a specified period of time.
contract MscpVesting is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// "session" data
  	address public currencyAddress;
  	uint public startTime;

    uint256 private endtime_private;
    uint256 private endtime_strategic;

    // constant variables
    uint256 constant private MULTIPLIER = 10**18;
    /// @dev total tokens to be released gradualy (without "day one" tokens)
    uint256 constant private TOTAL_PRIVATE = 8500000 * MULTIPLIER;
    uint256 constant private TOTAL_STRATEGIC = 8000000 * MULTIPLIER;

    uint256 constant private DURATION_PRIVATE = 8;
    uint256 constant private DURATION_STRATEGIC = 8;

    /// @dev TPS = Tokens Per Second
    /* uint256 constant private TPS_PRIVATE = MULTIPLIER * TOTAL_PRIVATE / 25920000;     /// 300 days
    uint256 constant private TPS_STRATEGIC = MULTIPLIER * TOTAL_STRATEGIC / 12960000; /// 150 days */
    /// only for testing
    uint256 constant private TPS_PRIVATE = TOTAL_PRIVATE / DURATION_PRIVATE;     /// 300 days
    uint256 constant private TPS_STRATEGIC = TOTAL_STRATEGIC / DURATION_STRATEGIC; /// 150 days

    struct Balance {
        uint256 remainingCoins;
    	  bool strategicInvestor;
        bool claimedBonus;      // true if "day one" tokens were claimed
    }

    mapping(address=>Balance) balances;

    event InvestorModified(address indexed investor, uint256 remainingCoins);
    event Withdraw(address indexed receiver, uint256 withdrawnAmount, uint256 remainingCoins);

    constructor (address _currencyAddress, uint256 _startTime) public {
        require(_currencyAddress != address(0), "invalid currency address");
        require(_startTime > now, "start time should be in future");

        currencyAddress = _currencyAddress;
        startTime = _startTime;

        endtime_private = startTime + DURATION_PRIVATE;
        endtime_strategic = startTime + DURATION_STRATEGIC;
    }

    /// @notice add strategic investor address
    /// @param _investor address to be added
    function addStrategicInvestor (address _investor) external onlyOwner {
        require(balances[_investor].remainingCoins == 0, "investor already has allocation");

        balances[_investor].remainingCoins = TOTAL_STRATEGIC;
        balances[_investor].strategicInvestor = true;

        emit InvestorModified(_investor, balances[_investor].remainingCoins);
    }

    /// @notice add private investor address
    /// @param _investor address to be added
    function addPrivateInvestor (address _investor) external onlyOwner {
        require(balances[_investor].remainingCoins == 0, "investor already has allocation");
        balances[_investor].remainingCoins = TOTAL_PRIVATE;
        emit InvestorModified(_investor, balances[_investor].remainingCoins);
    }

    /// @notice set investor remaining coins to 0
    /// @param _investor address to disable
    function disableInvestor (address _investor) external onlyOwner {
        require(balances[_investor].remainingCoins > 0, "investor already disabled");
        balances[_investor].remainingCoins = 0;
        emit InvestorModified(_investor, balances[_investor].remainingCoins);
    }

    /// @notice clam the unlocked tokens
    function withdraw () external {
        require(getAllocation(msg.sender) > 0, "nothing to withdraw");
        require(now >= startTime, "vesting hasnt started yet");

        Balance storage balance = balances[msg.sender];
        uint256 actualUnclaimed;
        uint256 timePassed;
        if(balance.strategicInvestor == true){
            //internal getTime (seperationj within function)
            if(now < endtime_strategic)
                timePassed = now.sub(startTime); //remove safeMath
            else
                timePassed = endtime_strategic.sub(startTime);
            //internal calculateAmount (seperation within function)
            uint256 unclaimedPotential = (timePassed * TPS_STRATEGIC);
            actualUnclaimed = unclaimedPotential - (TOTAL_STRATEGIC - balance.remainingCoins);
            balance.remainingCoins = balance.remainingCoins.sub(actualUnclaimed);
            //internal addBonus (seperation within function)
            if(!balance.claimedBonus) {
                balance.claimedBonus = true;
                actualUnclaimed = actualUnclaimed + 2000000 * MULTIPLIER; // 2 mil is released on day one
            }
        } else {
            //internal getTime (seperationj within function)
            if(now < endtime_private)
                timePassed = now.sub(startTime); //remove safeMath
            else
                timePassed = endtime_private.sub(startTime);
            uint256 unclaimedPotential = (timePassed * TPS_PRIVATE);
            actualUnclaimed = unclaimedPotential - (TOTAL_PRIVATE - balance.remainingCoins);
            balance.remainingCoins = balance.remainingCoins.sub(actualUnclaimed);
            if(!balance.claimedBonus) {
                balance.claimedBonus = true;
                actualUnclaimed = actualUnclaimed + 1500000 * MULTIPLIER; // 1.5 mil is released on day one
            }
        }
        IERC20(currencyAddress).safeTransfer(msg.sender, actualUnclaimed);

        emit Withdraw(msg.sender, actualUnclaimed, balance.remainingCoins);
    }

    /// @notice check if investor has any remaining coins
    /// @param _investor address to verify
    /// @return true if there are remaining coins at address
    /* function hasAllocation(address _investor) public view returns(bool) {
        return balances[_investor].remainingCoins > 0;
    } */

    function getAllocation(address _investor) public view returns(uint) {
        return balances[_investor].remainingCoins;
    }

}
