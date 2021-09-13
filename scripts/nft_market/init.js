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

    let nftMarket = await NftMarket.at("0xae54f8927ADAdB65EC79f7130B1a46FEd35E8bFd");
    let nft     = await Nft.at("0x607cBd90BE76e9602548Fbe63931AbE9E8af8aA7");
    let crowns  = await Crowns.at("0x6fc9651f45B262AE6338a701D563Ab118B1eC0Ce");

    let user = accounts[0];
    console.log(`Using ${user}`);

    // enable sales (onlyOwner) -only needs to run once
    let salesStarted = await nftMarket.enableSales(true, {from: user}).catch(console.log);
    console.log(`salesEnabled was set`);

    // add nft address -only needs to run once per nft
    let nftAddressAdded = await nftMarket.addSupportedNft(nft.address, {from: user}).catch(console.error)
      .catch(console.error);
    console.log("nft address added");

    // add currency address -only needs to run once per currency
    let currencyAddressAdded = await nftMarket.addSupportedCurrency(crowns.address, {from: user})
      .catch(console.error);
    console.log("crowns address added");

    await nftMarket.addSupportedCurrency("0x0000000000000000000000000000000000000000", {from: user})
      .catch(console.error);
    console.log("native address added");

    await nftMarket.addSupportedCurrency("0xbD90A6125a84E5C512129D622a75CDDE176aDE5E", {from: user})
    .catch(console.error);
  console.log("rib address added");
    
}.bind(this);
