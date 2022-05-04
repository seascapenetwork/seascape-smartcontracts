pragma solidity 0.6.7;
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Multi send is a part of Seascape marketplace platform.
/// It allows users to send a batch of nfts to desired address
/// @author Nejc Schneider
contract MultiSend {
    function sendNfts(uint amount, address receiver, address nftAddresses[], uint nftIds[])
        external
        returns(uint)
    {
        require(amount > 1, "minimum 2 nfts are required.");
        require(amount < 10, "maximum 10 nfts are allowed.");
        for(uint i = 0; i < amount; ++i){
          IERC721 nft = IERC721(_offeredTokens[index].tokenAddress);
          require(nft.ownerOf(_offeredTokens[index].tokenId) == msg.sender,
              "sender not owner of nft");
        }
        for(uint i = 0; i < amount; ++i){
          IERC721(obj.offeredTokens[index].tokenAddress)
              .safeTransferFrom(address(this), msg.sender, obj.offeredTokens[index].tokenId);
        }


        return amount;
}
