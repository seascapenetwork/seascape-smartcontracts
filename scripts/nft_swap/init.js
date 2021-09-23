let NftSwap = artifacts.require("NftSwap");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let ScapeSwapParams = artifacts.require("ScapeSwapParams");



let accounts;
let feeRate = web3.utils.toWei("100", "milli");

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


    let user = accounts[0];
    console.log(`Using ${user}`);

    // enable sales (onlyOwner) -only needs to run once
    let tradeEnabled = await nftSwap.enableTrade(true, {from: user});
    console.log(`tradeEnabled was set`);

    // add currency address -only needs to run once per currency
    let currencyAddressAdded = await nftSwap.addSupportedBountyAddresses(crowns.address, {from: user})
      .catch(console.error);
    console.log("currency address added");

    // add nft address -only needs to run once per nft
    let nftAddressAdded = await nftSwap.enableSupportedNftAddress(nft.address, scapeSwapParams.address, {from: user})
      .catch(console.error);
    console.log("nft address added");

    // change the fee rate
    let feeSet = await nftSwap.setFee(feeRate, {from: user});
    console.log(`feeRate was changed`);

}.bind(this);
