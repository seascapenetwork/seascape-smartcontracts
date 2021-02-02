let LpMining = artifacts.require("LpMining");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let reward = web3.utils.toWei("1000", "ether");  // cws
let period = 3600 * 2;
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

    let lpMining;
    if (networkId != 4) {
        lpMining = await LpMining.deployed();
    } else {
	lpMining = await LpMining.at("0x255C9ffD5EedEBD5bA99df58BB6C19872d3E8d0a");
    }
    let factory = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");

    let crowns  = await Crowns.at("0x168840df293413a930d3d40bab6e1cd8f406719d");	

    if (networkId != 4) {
	let lpToken = await LpToken.deployed();
	lpTokenAddress = lpToken.address;
    }

    let sessionId = await lpMining.lastSessionIds.call(lpTokenAddress);
    console.log(sessionId +" session id for "+lpTokenAddress);
    //console.log(lpMining.address);
    //return;
    
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

