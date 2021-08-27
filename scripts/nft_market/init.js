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

    let nftMarket = await NftMarket.at("0xF4C4Ea5508Fe0EEb3E2f300AB8AfFDa1881cf96a");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");


    let user = accounts[0];
    console.log(`Using ${user}`);

    // enable sales (onlyOwner) -only needs to run once
    let salesStarted = await nftMarket.enableSales(true, {from: user});
    console.log(`salesEnabled was set`);

    // add nft address -only needs to run once per nft
    let nftAddressAdded = await nftMarket.addSupportedNft(nft.address, {from: user})
      .catch(console.error);
    console.log("nft address added");

    // add currency address -only needs to run once per currency
    let currencyAddressAdded = await nftMarket.addSupportedCurrency(crowns.address, {from: user})
      .catch(console.error);
    console.log("currency address added");

}.bind(this);
