pragma solidity 0.6.7;

import "./../../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../../openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract VaultHandler {
    using SafeERC20 for IERC20;
    
    constructor() public { }

    function transferFromUserToVault(address token, uint256 amount, address user) internal returns(uint256) {
        require(user != msg.sender, "VAULT_HANDLER: user can not call this function");
        if (token == address(0)) {
            require(msg.value >= amount, "VAULT_HANDLER: not enough native token");
            return msg.value;
        }
        IERC20 _token = IERC20(token);
        require(_token.balanceOf(user) >= amount, "VAULT_HANDLER: user has not enough token");
        
        uint256 preTotalAmount = _token.balanceOf(address(this));

        _token.safeTransferFrom(user, address(this), amount);

        uint256 actualAmount = _token.balanceOf(address(this)) - preTotalAmount;

        return actualAmount;
    }

    function transferFromVaultToUser(address token, uint256 amount, address user) internal returns(uint256) {
        if (token == address(0)) {
            payable(user).transfer(amount);
            return amount;
        }
        IERC20 _token = IERC20(token);
        require(_token.balanceOf(address(this)) >= amount, "VAULT_HANDLER: vault has not enough token");
        
        _token.safeTransfer(user, amount);

        return amount;
    }

    function tokenBalanceOfVault(address token) internal view returns(uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        IERC20 _token = IERC20(token);
        return _token.balanceOf(address(this));
    }
}