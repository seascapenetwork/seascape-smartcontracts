pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

/// @title NftSwapParams is a digital signature verifyer / nft parameters encoder / decoder
/// @author Nejc Schneider
contract NftSwapParams{

    // takes in pramams and converts to seascape
    function isValidParams(bytes encodedParams) returns (bool){
      arrayWithParams = this.decodeParamaters(encodedParams);
    	// check if signature is valid
      // const isValid = ecrecover (arrayWithParams)
    	return isValid;
    }

    function encodeParams (uint imgId, uint gen, uint8 quality, bytes32 signature) returns (bytes){
      // bytes messageNoPrefix = abi.encode(imgId, gen, quality, signature)
      // return messageNoPrefix;
    }

    function decodeParams (bytes) returns (uint imgId, uint generation, uint8 quality, bytes32 signature){
      	 /// params: 1. what to decode 2. how to decode it 3.
      	 (imgId, generaton, quality, signature) = abi.decode(bytes, (uint, uint, uint8, bytes32) )
         return [imgId, generation, quality, signature];
    }


}
