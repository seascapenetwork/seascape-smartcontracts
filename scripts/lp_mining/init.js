let LpMining = artifacts.require("LpMining");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let reward = web3.utils.toWei("25000", "ether");  // cws
let period = 5184000;
let generation = 0;
let lpTokenAddress = "0x40449d1f4c2d4f88dfd5b18868c76738a4e52fd4";

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
    let factory;
    let nft;
    let crowns;
    if (networkId != 4) {
        lpMining = await LpMining.deployed();
	factory  = await Factory.deployed();
	nft      = await Nft.deployed();
	crowns   = await Crowns.deployed();	
    } else {
	lpMining = await LpMining.at("0x848A660cD3A2b9dbfFf8AE70c8b59bAAd70F0a44");
	factory = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
	nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
	crowns  = await Crowns.at("0x168840df293413a930d3d40bab6e1cd8f406719d");	
    }

    /// done by first contract deployer
    //await nft.setFactory(factory.address);
    //console.log("1/2 Nft factory was linked to Nft");

    //await factory.addStaticUser(lpMining.address);
    //console.log("2/2 Staking contract got a permission");
    //return;

    
    //console.log(lpMining.address);
    //return;

    //if (networkId != 4) {
    //let lpToken = await LpToken.deployed();
    //	lpTokenAddress = lpToken.address;
    //}
    
    // should transfer reward amount to contract
    //await crowns.transfer(lpMining.address, reward, {from: accounts[0]});
    //console.log("Crowns for session were transferred to the Lp Mining smartcontract");

    let startTime = Math.floor(new Date().getTime()/1000) + 80;
    await lpMining.startSession(lpTokenAddress, reward, period, startTime, generation);
    console.log("Session started");

    let sessionId = await lpMining.lastSessionIds.call(lpTokenAddress);
    console.log(sessionId +" session id for "+lpTokenAddress);
    
    return true;
}.bind(this);

