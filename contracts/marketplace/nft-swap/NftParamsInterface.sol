pragma solidity 0.6.7;


/// @dev Interface of the nftSwapParams

interface NftParamsInterface {

    /// @dev Returns true if signature is valid
    function paramsAreValid(uint256 _offerId, bytes calldata _encodedParams,
        uint8 v, bytes32 r, bytes32 s) external view returns (bool);

}
