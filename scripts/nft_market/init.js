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

    let nftMarket = await NftMarket.at("0xae54f8927ADAdB65EC79f7130B1a46FEd35E8bFd").catch(console.error);
    // let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    // let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");

    let user = accounts[0];
    console.log(`Using ${user}`);

    // enable sales (onlyOwner) -only needs to run once
    // let salesStarted = await nftMarket.enableSales(true, {from: accounts[1]});
    // console.log(`Enable sales is set to ${salesStarted.receipt.status}`);

    // add nft address -only needs to run once per nft
    let nftAddressAdded = await nftMarket.addSupportedNft("0x62C0f58c730741366B85CdA4609F20910B59D21B", {from: user, gasPrice: 20000000000})
      .catch(console.error);
    console.log("nft address added");

    // add currency address -only needs to run once per currency
    // let currencyAddressAdded = await nftMarket.addSupportCurrency(crowns.address, {from: user})
      // .catch(console.error);
    // console.log("currency address added");

}.bind(this);
