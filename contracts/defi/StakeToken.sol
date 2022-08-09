// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Stake.sol";
import "./../mini-game/game-5/helpers/VaultHandler.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @dev The core functionality of the DeFi.
/// This is Stake erc20/native, and earn another erc20/native currency.
/// It has two isolation groups:
/// Per smartcontract, per session.
/// Every smartcontract's staking is isolated from another smartcont stakings.
/// For staking of smartcontract, smartcontract can initialize as many periods, as he wants.
contract StakeToken is ReentrancyGuard, VaultHandler, Stake {
    using SafeERC20 for IERC20;

    struct Period {
        address stakeToken;
        address rewardToken;
    }
    mapping(address => mapping(uint256 => Period)) public periods;

    event NewPeriod(address indexed namespace, uint256 key, address indexed stakeToken, address indexed rewardToken, uint256 startTime, uint256 endTime);

    constructor (address _vault) VaultHandler(_vault) {}

    /// @notice a new staking period in the namespace of this method caller.
    function newPeriod(
        uint256 key,
        address stakeToken,
        address rewardToken,
        uint256 startTime,
        uint256 endTime,
        uint256 rewardPool
    )
        external
    {
        if (stakeToken != address(0)) {
            require(IERC20(stakeToken).decimals() == 18, "DECIMAL_WEI");
        }
        if (rewardToken != address(0)) {
            require(IERC20(rewardToken).decimals() == 18, "DECIMAL_WEI");
        }
        newStakePeriod(key, startTime, endTime, rewardPool);

        // Challenge.stake is not null, means that earn is not null too.
        Period storage period       = periods[msg.sender][key];
        period.stakeToken           = stakeToken;
        period.rewardToken          = rewardToken;

        emit NewPeriod(msg.sender, key, stakeToken, rewardToken, startTime, endTime);
    }

    /// @dev The ZombieFarm calls this function when the session is active only.
    function stake(uint256 key, address stakerAddr, uint256 amount)
        external
        nonReentrant
    {
        require(amount > 0,     "STAKE_TOKEN: zero_value");

        deposit(key, stakerAddr, amount);

        /// Transfer tokens to the Smartcontract
        Period storage period       = periods[msg.sender][key];
        transferFromUserToVault(period.stakeToken, amount, stakerAddr);
    }

    function unstake(uint256 key, address stakerAddr, uint256 amount)
        external
        nonReentrant
    {
        withdraw(key, stakerAddr, amount);

        address stakeToken = periods[msg.sender][key].stakeToken;
        transferFromVaultToUser(stakeToken, amount, stakerAddr);
    }

    function claim(uint256 key, address stakerAddr)
        external
        nonReentrant
        returns(uint256)
    {
        return reward(key, stakerAddr);
    }

    function _claim(uint key, address stakerAddr, uint interest) internal override returns(bool) {
        address rewardToken = periods[msg.sender][key].rewardToken;
        
        transferFromVaultToUser(rewardToken, interest, stakerAddr);

        return true;
    }  
      
    receive() external payable {
        // React to receiving ether
    }
}
