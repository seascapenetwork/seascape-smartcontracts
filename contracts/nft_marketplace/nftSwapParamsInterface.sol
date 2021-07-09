pragma solidity ^0.6.0;

/**
 * @dev Interface of the nftSwapParameters
 */
interface IERC20 {

    /// @dev Returns true if signature is valid
    function isValidParams(bytes encodedParameters) external returns (bool);

}
