pragma solidity 0.6.7;
pragma experimental ABIEncoderV2;

import "./../SwapSigner.sol";

/// @title CitySwapParams is nft params encoder/decoder, signature verifyer
/// @author Nejc Schneider
contract CitySwapParams {
    SwapSigner private swapSigner;

    constructor(address _signerAddress) public {
        swapSigner = SwapSigner(_signerAddress);
    }

    function paramsAreValid (uint256 _offerId, bytes memory _encodedData,
      uint8 v, bytes32 r, bytes32 s) public view returns (bool){

      (uint256 nftId, uint8 category) = decodeParams(_encodedData);

      bytes32 hash = this.encodeParams(_offerId, nftId, category);

      address recover = ecrecover(hash, v, r, s);
      require(recover == swapSigner.getSigner(),  "Verification failed");

    	return true;
    }

    function encodeParams(
        uint256 _offerId,
        uint256 _nftId,
        uint8 _category
    )
        public
        pure
        returns (bytes32 message)
    {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 messageNoPrefix = keccak256(abi
            .encode(_offerId, _nftId, _category));
        bytes32 hash = keccak256(abi.encodePacked(prefix, messageNoPrefix));

        return hash;
    }

    function decodeParams (bytes memory _encodedData)
        public
        pure
        returns (
            uint256,
            uint8
        )
    {
        (uint256 nftId, uint8 category) = abi
            .decode(_encodedData, (uint256, uint8));

        return (nftId, category);
    }


}
