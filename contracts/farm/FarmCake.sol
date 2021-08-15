pragma solidity ^0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./FarmInterface.sol";

interface PancakeStaking {
    function withdraw(uint256 _pid, uint256 _amount) external;
    function emergencyWithdraw(uint256 _pid) external;
    function deposit(uint256 _pid, uint256 _amount) external;
}

/// @dev This farming contract farms Cake tokens.
contract FarmCake is Ownable, FarmInterface {
    /// @notice the LP address that is farming Cakes
    address public stake;
    /// @notice the Process ID of the farm
    uint256 public pid;
    /// @notice The PancakeSwap: Main Staking Contract
    address public pancakeStaking;
    /// @notice The Hodl is the contract that keeps all assets from the games.
    address public hodl;

    /// @dev the rewarding address
    address reward;
    /// @dev the farming token
    address cake;

    uint256 constant MAX_INT = 2**256 - 1;

    bool resumed = true;

    /// @notice Total amount of tokens that are staked
    uint256 public totalAmount;

    /// Set 0x6615CE60D71513aA4849269dD63821D324A23F8C for pCWS-BNB
    /// Set 333 for PID
    /// Set 0x73feaa1eE314F8c655E354234017bE2193C9E24E for main staking contract
    constructor(address _stake, uint256 _pid, address _staking, address _hodl, address _reward, address _cake) public {
        stake = _stake;
        pid = _pid;
        pancakeStaking = _staking;
        hodl = _hodl;
        reward = _reward;
        cake = _cake;

        /// We need to approve for staking to use the tokens.
        IERC20 token = IERC20(_stake);
        token.approve(_staking, MAX_INT);
    }

    modifier onlyHodl {
        require(msg.sender == hodl, "If God doesn't allow, only Seascape Hodl contract allowed for it.");
        _;
    }

    modifier whenResumed {
        require(resumed, "Contract halted");
        _;
    }

    function isResumed() external override returns(bool) {
        return resumed;
    }

    /// @notice The hodler deposits the tokens to this Contract.
    /// Then this contract deposits the LP to Staking contract.
    function deposit(uint256 _amount) external override onlyHodl whenResumed returns(bool) {
        require(totalAmount + _amount <= MAX_INT, "overflow");
        /// First we deposit it.
        IERC20 token = IERC20(stake);
        token.transferFrom(hodl, address(this), _amount);

        PancakeStaking staking = PancakeStaking(pancakeStaking);
        staking.deposit(pid, _amount);

        IERC20 rewardToken = IERC20(cake);
        uint256 totalBalance = rewardToken.balanceOf(address(this));
        if (totalBalance > 0) {
            rewardToken.transferFrom(address(this), reward, totalBalance);
        }


        totalAmount = totalAmount + _amount;

        return true;
    }

    /// @notice The hodler withdraw the tokens to this Contract.
    /// Then this contract withdraws the LP to Staking contract.
    function withdraw(uint256 _amount) external override onlyHodl whenResumed returns(bool) {
        PancakeStaking staking = PancakeStaking(pancakeStaking);
        staking.withdraw(pid, _amount);
        
        /// First we deposit it.
        IERC20 token = IERC20(stake);
        token.transferFrom(address(this), hodl, _amount);

        IERC20 rewardToken = IERC20(cake);
        uint256 totalBalance = rewardToken.balanceOf(address(this));
        if (totalBalance > 0) {
            rewardToken.transferFrom(address(this), reward, totalBalance);
        }

        totalAmount = totalAmount - _amount;

        return true;
    }

    function withdrawAll() external override onlyHodl whenResumed returns(bool) {
        PancakeStaking staking = PancakeStaking(pancakeStaking);

        staking.withdraw(pid, totalAmount);
        
        /// First we deposit it.
        IERC20 token = IERC20(stake);
        token.transferFrom(address(this), hodl, totalAmount);

        IERC20 rewardToken = IERC20(cake);
        uint256 totalBalance = rewardToken.balanceOf(address(this));
        if (totalBalance > 0) {
            rewardToken.transferFrom(address(this), reward, totalBalance);
        }

        totalAmount = 0;

        return true;
    }

    /// @notice The contract stops the farming.
    function halt() external onlyOwner whenResumed {
        PancakeStaking staking = PancakeStaking(pancakeStaking);
        staking.emergencyWithdraw(pid);

        IERC20 token = IERC20(stake);

        // We need to transfer player's token to the hodler
        uint256 totalBalance = token.balanceOf(address(this));
        if (totalBalance > 0) {
            token.transferFrom(address(this), hodl, totalBalance);
        }

        resumed = false;
        totalAmount = 0;
    }

    function resume() external onlyOwner {
        require(resumed == false, "Contract halted");
        resumed = true;
    }
}