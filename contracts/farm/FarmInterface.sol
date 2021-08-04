pragma solidity ^0.6.7;

/// @dev This farming contract interface.
interface FarmInterface {
    function isResumed() external returns(bool);

    /// @notice The hodler deposits the tokens to this Contract.
    /// Then this contract deposits the LP to Staking contract.
    function deposit(uint256 _amount) external returns(bool);

    /// @notice The hodler withdraw the tokens to this Contract.
    /// Then this contract withdraws the LP to Staking contract.
    function withdraw(uint256 _amount) external returns(bool);

    /// @notice The hodler withdraws everything
    function withdrawAll() external returns(bool);
}
