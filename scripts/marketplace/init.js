let NftMarket = artifacts.require("NftMarket");


let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nftMarket = await NftMarket.at("0xEE00cfaf731B0801e4872389e009a5aB0C05c5f6");


    let user = accounts[0];
    console.log(`Using ${user}`);

    let currencyAddress = "0x4bDE98731149093a12579D71338fd3741fe6E5Ce";
    let nft = "0x34c11f00d1Cd6163fb7621c654B848e73F616D77";

    // enable sales (onlyOwner) -only needs to run once
    // let salesStarted = await nftMarket.enableSales(true, {from: user});
    // console.log(`salesEnabled was set`);

    // add nft address -only needs to run once per nft
    console.log("attempting to add nft address...");
    let nftAddressAdded = await nftMarket.addSupportedNft(nft, {from: user})
      .catch(console.error);
    console.log("nft address added");

    // remove nft address
    // console.log("attempting to remove nft address...");
    // let nftAddressRemoved = await nftMarket.removeSupportedNft(nft, {from: user})
    //   .catch(console.error);
    // console.log("nft address removed");

    // add currency address -only needs to run once per currency
    // console.log("attempting to add currency...");
    // let currencyAddressAdded = await nftMarket.addSupportedCurrency(currencyAddress).catch(console.error);
    // console.log("currency address added");

}.bind(this);
