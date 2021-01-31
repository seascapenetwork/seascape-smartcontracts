let LpMining = artifacts.require("LpMining");
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
    let res = init(networkId);
    console.log("Nft token was claimed successfully!");

    callback(null, res);
};

let init = async function(networkId) {
    web3.eth.getAccounts(function(err,res) { accounts = res; });
    let lpMining = await LpMining.deployed();
    let lpToken = await LpToken.deployed();

    let lastSessionId = await lpMining.lastSessionIds[lpToken];

    let nft = await Nft.deployed();
    let balance = await nft.balanceOf(accounts[0]);

    let crowns = await Crowns.deployed();
    let factory = await Factory.deployed();

    return await claimNft(lpMining, lastSessionId);
    console.log(res.logs[0]);
}.bind(this);

let claimNft = async function(lpMining, lastSessionId) {

    return await lpMining.claimNft(lastSessionId, {from: accounts[0]});
}.bind(this);
