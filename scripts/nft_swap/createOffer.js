let NftSwap = artifacts.require("NftSwap");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let ScapeSwapParams = artifacts.require("ScapeSwapParams");



let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nftSwap = await NftSwap.at("0x5Dc3c4E6B754b29ea91ea61B8Aa23fa58D33243e");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let scapeSwapParams = await ScapeSwapParams.at("0x4f084771DFa701a8b46Cd35525866E4a9278b8C9");


    // fetch nftId
    let nftId = await nft.tokenOfOwnerByIndex(user, 0)
      .catch(console.error);
    console.log(`First nft of ${user} is nft id ${nftId}`);

    // approve transfer of nft
    await nft.setApprovalForAll(nftSwap.address, true, {from: user})
      .catch(console.error);
    console.log("nftSwap was approved to spend nfts");

    /// solidity structs
    // struct OfferedToken{
    //     uint256 tokenId;                    // offered token id
    //     address tokenAddress;               // offered token address
    // }
    //
    // /// @notice individual requested token related data
    // struct RequestedToken{
    //     address tokenAddress;              // requested token address
    //     bytes tokenParams;                 // requested token Params - metadata
    //     uint8 v;
    //     bytes32 r;
    //     bytes32 s;
    // }

    //data required to createOffer
    let offeredTokensAmount = 1;
    let
    let requestedTokensAmount = 1;
    let bounty = web3.utils.toWei("3", "ether");
    let bountyAddress = ScapeSwapParams.address;

    //put nft for sale
    let price = web3.utils.toWei("1", "ether");
    let onSale = await nftSwap.createOffer(nftId, price, nft.address, crowns.address, {from: user})
      .catch(console.error);
    console.log(onSale.tx);
    console.log(`Nft id ${nftId} was put for sale`);


}.bind(this);
