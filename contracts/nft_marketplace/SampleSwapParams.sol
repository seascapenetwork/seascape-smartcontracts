pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./../openzeppelin/contracts/access/Ownable.sol";

/// @title NftSwapParams is a digital signature verifyer / nft parameters encoder / decoder
/// @author Nejc Schneider
contract SampleSwapParams is Ownable{

    // takes in _encodedData and converts to seascape
    function isValidParams (uint256 _offerId, bytes memory _encodedData,
      uint8 v, bytes32 r, bytes32 s) public view returns (bool){

      uint256 imgId = decodeParams(_encodedData);

      bytes32 hash = this.encodeParams(_offerId, imgId);

      address signer = ecrecover(hash, v, r, s);
      require(signer == owner(),  "Verification failed");

    	return true;
    }

    function encodeParams(
        uint256 _offerId,
        uint256 _imgId
    )
        public
        view
        returns (bytes32 message)
    {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 messageNoPrefix = keccak256(abi.encode(_offerId, _imgId));
        bytes32 hash = keccak256(abi.encodePacked(prefix, messageNoPrefix));

        return hash;
    }

    function decodeParams (bytes memory _encodedData)
        public
        view
        returns (uint256 imgId)
    {
        uint256 imgId = abi.decode(_encodedData, (uint256));

        return imgId;
    }


}
