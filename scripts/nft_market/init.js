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

    let nftMarket = await NftMarket.at("0x1af963a8bD09F13F412b967dcEB987d64a11dF05");


    let user = accounts[0];
    console.log(`Using ${user}`);

    let currencyAddress = "0x4bDE98731149093a12579D71338fd3741fe6E5Ce";
    let nft = "0x7cDc5D0188733eDF08412EECb9AFa840772615dC";

    // enable sales (onlyOwner) -only needs to run once
    // let salesStarted = await nftMarket.enableSales(true, {from: user});
    // console.log(`salesEnabled was set`);

    // add nft address -only needs to run once per nft
    console.log("attempting to add nft address...");
    let nftAddressAdded = await nftMarket.addSupportedNft(nft, {from: user})
      .catch(console.error);
    console.log("nft address added");

    // add currency address -only needs to run once per currency
    // console.log("attempting to add currency...");
    // let currencyAddressAdded = await nftMarket.addSupportedCurrency(currencyAddress).catch(console.error);
    // console.log("currency address added");

}.bind(this);
