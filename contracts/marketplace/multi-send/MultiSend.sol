pragma solidity 0.6.7;

import "./../../openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Multi send is a part of Seascape marketplace platform.
/// It allows users to send a batch of nfts to desired address
/// @author Nejc Schneider
contract MultiSend {
    function sendNfts(
        uint amount,
        address receiver,
        address[] calldata nftAddresses,
        uint[] calldata nftIds
    )
        external
        returns(uint)
    {
        require(amount > 1, "minimum 2 nfts are required");
        require(receiver != msg.sender, "receiver cant be same as sender");
        for(uint i = 0; i < amount; ++i){
            require(IERC721(nftAddresses[i]).ownerOf(nftIds[i]) == msg.sender,
              "sender not owner of nft");
        }
        for(uint i = 0; i < amount; ++i){
            IERC721(nftAddresses[i]).safeTransferFrom(msg.sender, receiver, nftIds[i]);
        }
        return amount;
    }
}
