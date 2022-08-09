// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;


/// @dev Interface of the nftSwapParams

interface LighthouseTierInterface {

    /// @dev returns investors tier rank 0 - 4; -1 if none
    function getTierLevel(address _investor) external view returns (int8);

}
