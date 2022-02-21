// contracts/Crowns.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.6.7;

interface CrownsInterface {
    function balanceOf(address account) external view returns (uint256);

    function spendFrom(address, uint256) external returns(bool);
    function spend(uint256) external returns(bool);

    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address from, address recipient, uint256 amount) external returns (bool);

}