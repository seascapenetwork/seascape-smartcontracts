let NftSwap = artifacts.require("NftSwap");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let ScapeMetadata = artifacts.require("ScapeMetadata");



let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {

    //--------------------------------------------------
    // Accounts and contracts configuration
    //--------------------------------------------------

    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nftSwap = await NftSwap.at("0xa7354413e805458c405aa00A680FDB179AfCedd5");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let scapeMetadata = await ScapeMetadata.at("0x8BDc19BAb95253B5B30D16B9a28E70bAf9e0101A");


    let buyer = accounts[1];
    console.log(`Using ${buyer}`);

    //--------------------------------------------------
    // Parameters setup
    //--------------------------------------------------

    let offerId = 1;
    let offeredTokensAmount = 1;
    let requestedTokensAmount = 1;

    console.log("attemping to fetch nftId");
    let tokenId = await nft.tokenOfOwnerByIndex(buyer, 0);
    tokenId = parseInt(tokenId.toString());
    console.log(`tokenId: ${tokenId}`);
    let requestedTokenIds = [tokenId, "0", "0", "0", "0"];
    let requestedTokenAddresses = [
      nft.address,
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000"
    ];


    //--------------------------------------------------
    // Function calls
    //--------------------------------------------------

    // ERC721 approve

    // approve transfer of nfts
    console.log("approving nftBurning to spend nfts...");
    await nft.setApprovalForAll(nftSwap.address, true, {from: buyer})
      .catch(console.error);
    // check if nfts are approved
    console.log("Checking if Nfts are approved ?")
    let approved = await nft.isApprovedForAll(buyer, nftSwap.address);
    console.log(approved);


    // contract main function calls
    console.log(`attempting to accept offer Id${offerId} `);
    let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount,
      requestedTokenIds, requestedTokenAddresses, {from: buyer}).catch(console.error);
    console.log(`offer was accepted.`);


    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // enable trade (true/false) -only needs to run once
    // async function createOffer(tradeEnabled){
    //   console.log("attempting to create new offer...");
    //   await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
    //     requestedTokensArray, bounty, bountyAddress, {from: owner});
    //   console.log(`new offer was created.`);
    // }

}.bind(this);
