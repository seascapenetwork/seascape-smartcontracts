pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../seascape_nft/SeascapeNft.sol";
import "./Crowns.sol";

/// @title Nft Market is a trading platform on seascape network allowing to buy and sell Nfts
/// @author Nejc Schneider
contract NftSwapParameters{

    // takes in pramams and converts to seascape
    function isValidParams(bytes) returns (bool){
      arraywithParams = this.decodeParamaters();
    	//check if signature is valid
      // isValid = ecrecover
    	return isValid;
    }

    function encodeParameters (uint imgId, uint gen, uint8 quality, bytes32 signature) returns (bytes){
      // bytes messageNoPrefix = abi.encode(uint)
      // return messageNoPrefix;
    }

    function decodeParameters (bytes) returns (uint imgId, uint generation, uint8 quality, bytes32 signature){
      	 /// params: 1. what to decode 2. how to decode it 3.
      	 (imgId, generaton, quality, signature) = abi.decode(bytes, (uint, uint, uint8, bytes32) )
         return [imgId, generation, quality, signature];
    }


}
