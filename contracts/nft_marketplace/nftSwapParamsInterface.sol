pragma solidity ^0.6.0;


/// @dev Interface of the nftSwapParams

interface NftSwapParamsInterface {

    /// @dev Returns true if signature is valid
    function isValidParams(bytes encodedParams) external returns (bool);

}
