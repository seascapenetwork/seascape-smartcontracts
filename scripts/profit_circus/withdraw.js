let ProfitCircus = artifacts.require("ProfitCircus");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let depositInt = "5";
let depositAmount = web3.utils.toWei(depositInt, "ether");
let accounts;

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = init(networkId);
    console.log(+depositInt+" lp tokens were withdrawn successfuly!");

    callback(null, res);
};

let init = async function(networkId) {
    web3.eth.getAccounts(function(err,res) { accounts = res; });
    let profitCircus = await ProfitCircus.deployed();
    let lpToken = await LpToken.deployed();

    let lastSessionId = await profitCircus.lastSessionIds[lpToken];

    let nft = await Nft.deployed();
    let balance = await nft.balanceOf(accounts[0]);

    let crowns = await Crowns.deployed();
    let factory = await Factory.deployed();

    return await withdraw(profitCircus, crowns, lastSessionId);
    console.log(res.logs[0]);
}.bind(this);

let withdraw = async function(lpMining, crowns, lastSessionId) {

    return await lpMining.withdraw(lastSessionId, depositAmount, {from: accounts[0]});
}.bind(this);
