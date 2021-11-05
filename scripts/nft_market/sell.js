let NftMarket = artifacts.require("NftMarket");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");


let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nftMarket = await NftMarket.at("0xbB8b7bF5CAd05829DC99eEFF469C9431CA2F75DF");
    let nft     = await Nft.at("0x66638F4970C2ae63773946906922c07a583b6069");
    let crowns  = await Crowns.at("0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B");


    let user = accounts[0];
    console.log(`Using ${user}`);

    // fetch nftId
    let nftId = await nft.tokenOfOwnerByIndex(user, 0)
      .catch(console.error);
    console.log(`First nft of ${user} is nft id ${nftId}`);

    // approve transfer of nft
    await nft.setApprovalForAll(nftMarket.address, true, {from: user})
      .catch(console.error);
    console.log("nftMarket was approved to spend nfts")

    //put nft for sale
    let price = web3.utils.toWei("1", "ether");
    let onSale = await nftMarket.sell(nftId, price, nft.address, crowns.address, {from: user})
      .catch(console.error);
    console.log(onSale.tx);
    console.log(`Nft id ${nftId} was put for sale`);

}.bind(this);
