let ProfitCircus = artifacts.require("LpMining");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    console.log("Nft token was claimed successfully!");

    callback(null, res);
};

let init = async function(networkId) {
    web3.eth.getAccounts(function(err,res) { accounts = res; });

    // // rinkeby
    // let profitCircus    =  await ProfitCircus.at("0x9Ee9fb0930f2B5e3Dd4ad1BA2edB87D8549A9e07").catch(console.error);
  	// let crowns          = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D").catch(console.error);

    // // rinkeby v2
    // let profitCircus       = await ProfitCircus.at("0x1C9F8cF1bcC7900Ea784E4b8312c6eFc250958F6");
    // let crowns             = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    
    // moonbase
    let profitCircus    = await ProfitCircus.at("0xa7a98F2BCa3dFe72010841cE6B12Ce4810D0f8F4");
    let crowns          = await Crowns.at("0xb3B32cBF0397AB03018504404EB1DDcd3a85cCB6");
  
    let lastSessionId = await profitCircus.lastSessionIds(crowns.address).catch(console.error);

    await claimNft(profitCircus, lastSessionId).catch(console.error);
    console.log("Claimed");
}.bind(this);

let claimNft = async function(profitCircus, lastSessionId) {
    return await profitCircus.claimNft(lastSessionId, {from: accounts[0]});
}.bind(this);
