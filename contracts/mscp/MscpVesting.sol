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

    // TODO remove constructor, hardcoded variables
    constructor (address _currencyAddress, uint256 _startTime) public {
        require(_currencyAddress != address(0), "invalid currency address");
        require(_startTime > now, "start time should be in future");

        currencyAddress = _currencyAddress;
        startTime = _startTime;

        endtime_private = startTime + DURATION_PRIVATE;
        endtime_strategic = startTime + DURATION_STRATEGIC;
    }

    //--------------------------------------------------------------------
    //  external functions
    //--------------------------------------------------------------------

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
        uint256 timePassed = getTime();
        uint256 availableAmount = getAvailableTokens(balance
            .strategicInvestor, timePassed, balance.remainingCoins);

        balance.remainingCoins = balance.remainingCoins.sub(availableAmount);
        if(!balance.claimedBonus){  // @dev bonus should not be substracted from remaining coins
            balance.claimedBonus = true;
            availableAmount = availableAmount + getBonus(balance.strategicInvestor);
        }

        IERC20(currencyAddress).safeTransfer(msg.sender, availableAmount);

        emit Withdraw(msg.sender, availableAmount, balance.remainingCoins);
    }

    //--------------------------------------------------------------------
    //  internal functions
    //--------------------------------------------------------------------

    /// @notice get amount of tokens user has yet to withdraw
    /// @param _investor address to check
    /// @return amount of remaining coins
    // NOTE may switch to internal
    function getAllocation(address _investor) public view returns(uint) {
        return balances[_investor].remainingCoins;
    }

    /// @dev calculate how much time has passed since start.
    /// If vesting is finished, return length of the session
    /// @return duration of time in seconds
    function getTime() internal view returns(uint) {
        if(now < endtime_strategic)
            return now.sub(startTime); //remove safeMath
        return endtime_strategic.sub(startTime);
    }

    /// @dev calculate how many tokens are available for withdrawal
    /// @param _strategicInvestor true if strategic investor
    /// @param _timePassed amount of time since vesting started
    /// @param _remainingCoins amount of unspent tokens
    /// @return tokens amount
    function getAvailableTokens(
        bool _strategicInvestor,
        uint256 _timePassed,
        uint256 _remainingCoins
    )
        internal
        view
        returns(uint)
    {
        if(_strategicInvestor){
            uint256 unclaimedPotential = (_timePassed * TPS_STRATEGIC);
            return unclaimedPotential - (TOTAL_STRATEGIC - _remainingCoins);
        } else {
            uint256 unclaimedPotential = (_timePassed * TPS_PRIVATE);
            return unclaimedPotential - (TOTAL_PRIVATE - _remainingCoins);
        }
    }

    /// @dev calculate bonus based on investor type
    /// @param _strategicInvestor true if strategic investor
    /// @return bonus amount
    function getBonus(bool _strategicInvestor) internal view returns(uint) {
        if(_strategicInvestor)
            return 2000000 * MULTIPLIER; // 2 mil is released on day one
        return 1500000 * MULTIPLIER; // 1.5 mil is released on day one
    }
}
