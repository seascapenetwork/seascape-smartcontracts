let LpMining = artifacts.require("LpMining");
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
    console.log("Deposit of "+depositInt+" CWS was successful!");

    callback(null, res);
};

let init = async function(networkId) {
    web3.eth.getAccounts(function(err,res) { accounts = res; });
    let lpMining = await LpMining.deployed();
    let lpToken = await LpToken.deployed();

    let lastSessionId = await lpMining.lastSessionIds.call(lpToken.address);

    let nft = await Nft.deployed();
    let balance = await nft.balanceOf(accounts[0]);

    let crowns = await Crowns.deployed();
    let factory = await Factory.deployed();

    let res =  await deposit(lpMining, crowns, lastSessionId);
    console.log(res.logs[0]);
}.bind(this);

let deposit = async function(lpMining, crowns, lastSessionId) {

    //should approve nft rush to spend cws of player
    await crowns.approve(lpMining.address, depositAmount);

    //should spend CWS in nft rush
    return await lpMining.deposit(lastSessionId, depositAmount, {from: accounts[0]});
}.bind(this);
