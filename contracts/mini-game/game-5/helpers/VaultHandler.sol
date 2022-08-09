// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../../../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../../../openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract VaultHandler {
    using SafeERC20 for IERC20;
    
    /// @dev The account that keeps all ERC20 rewards.
    address public vault;

    event VaultSet(address indexed vault);

    constructor(address _vault) public {
        require(_vault != address(0), "VAULT_HANDLER: ZERO_ADDR");
        vault = _vault;

        emit VaultSet(vault);
    }

    function transferFromUserToVault(address token, uint256 amount, address user) internal returns(uint256) {
        if (token == address(0)) {
            require(msg.value >= amount, "VAULT_HANDLER: not enough native token");
            return msg.value;
        }
        IERC20 _token = IERC20(token);
        require(_token.balanceOf(user) >= amount, "VAULT_HANDLER: user has not enough token");
        
        uint256 preTotalAmount = _token.balanceOf(vault);

        _token.safeTransferFrom(user, vault, amount);

        uint256 actualAmount = _token.balanceOf(vault) - preTotalAmount;

        return actualAmount;
    }

    function transferFromVaultToUser(address token, uint256 amount, address user) internal returns(uint256) {
        if (token == address(0)) {
            payable(user).transfer(amount);
            return amount;
        }
        IERC20 _token = IERC20(token);
        require(_token.balanceOf(vault) >= amount, "VAULT_HANDLER: vault has not enough token");
        
        _token.safeTransferFrom(vault, user, amount);

        return amount;
    }

    function tokenBalanceOfVault(address token) internal view returns(uint256) {
        if (token == address(0)) {
            return vault.balance;
        }
        IERC20 _token = IERC20(token);
        return _token.balanceOf(vault);
    }
}