let LpMining = artifacts.require("LpMining");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let reward = web3.utils.toWei("200", "ether");  // cws
let period = 3600 * 24 * 7;   // 1 week
let generation = 0;
let lpTokenAddress = "0xdc935332d39a4c632864dbbed3cfdbf049fb9267";

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = init(networkId);
    
    callback(null, res);
};

let init = async function(networkId) {
    web3.eth.getAccounts(function(err,res) { accounts = res; });

    let lpMining = await LpMining.deployed();
    let factory = await Factory.deployed();
    let nft     = await Nft.deployed();

    let crowns  = await Crowns.deployed();
	
    if (networkId != 4) {
	let lpToken = await LpToken.deployed();
	lpTokenAddress = lpToken.address;
    }

    let sessionId = await lpMining.lastSessionIds.call(lpTokenAddress);
    console.log(sessionId +" session id for "+lpTokenAddress);
    console.log(lpMining.address);
    return;
    
    // should transfer reward amount to contract
    await crowns.transfer(lpMining.address, reward, {from: accounts[0]});
    console.log("Crowns for session were transferred to the Lp Mining smartcontract");

    let startTime = Math.floor(new Date().getTime()/1000) + 30;
    await lpMining.startSession(lpTokenAddress, reward, period, startTime, generation);
    console.log("Session started");

    await lpMining.setNftFactory(factory.address);
    console.log("Nft factory was linked to Lp Mining smartcontract");

    await nft.setFactory(factory.address);
    console.log("Nft factory was linked to Nft");

    await factory.addStaticUser(lpMining.address);
    console.log("Staking contract got a permission");

    return true;
}.bind(this);

