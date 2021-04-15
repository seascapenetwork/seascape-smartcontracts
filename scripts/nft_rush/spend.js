let NftRush = artifacts.require("NftRush");
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
    
    console.log("Spend of "+depositInt+" CWS was successful!");

    callback(null, res);
};

let init = async function(networkId) {
    web3.eth.getAccounts(function(err,res) { accounts = res; });
    let nftRush = await NftRush.deployed();

    let crowns = await Crowns.deployed();

    let lastSessionId = await nftRush.lastSessionId();
    
    let res = await spend(nftRush, crowns, lastSessionId);
    console.log(res.logs[0]);
}.bind(this);


let spend = async function(nftRush, crowns, lastSessionId) {

    //should approve nft rush to spend cws of player
    await crowns.approve(nftRush.address, depositAmount);

    //should spend CWS in nft rush
    return await nftRush.spend(lastSessionId, depositAmount, {from: accounts[0]});    
}.bind(this);
