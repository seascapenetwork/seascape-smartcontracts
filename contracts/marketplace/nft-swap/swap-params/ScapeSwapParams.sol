// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./../SwapSigner.sol";

/// @title ScapeSwapParams is nft params encoder/decoder, signature verifyer
/// @author Nejc Schneider
contract ScapeSwapParams {
    SwapSigner private swapSigner;

    constructor(address _signerAddress) {
        swapSigner = SwapSigner(_signerAddress);
    }

    // takes in _encodedData and converts to seascape
    function paramsAreValid (uint256 _offerId, bytes memory _encodedData,
      uint8 v, bytes32 r, bytes32 s) public view returns (bool){

      (uint256 imgId, uint256 generation, uint8 quality) = decodeParams(_encodedData);

      bytes32 hash = this.encodeParams(_offerId, imgId, generation, quality);

      address recover = ecrecover(hash, v, r, s);
      require(recover == swapSigner.getSigner(),  "Verification failed");

    	return true;
    }

    function encodeParams(
        uint256 _offerId,
        uint256 _imgId,
        uint256 _generation,
        uint8 _quality
    )
        public
        view
        returns (bytes32 message)
    {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 messageNoPrefix = keccak256(abi
            .encode(_offerId, _imgId, _generation, _quality));
        bytes32 hash = keccak256(abi.encodePacked(prefix, messageNoPrefix));

        return hash;
    }

    function decodeParams (bytes memory _encodedData)
        public
        view
        returns (
            uint256 ,
            uint256,
            uint8
        )
    {
        (uint256 imgId, uint256 generation, uint8 quality) = abi
            .decode(_encodedData, (uint256, uint256, uint8));

        return (imgId, generation, quality);
    }


}
