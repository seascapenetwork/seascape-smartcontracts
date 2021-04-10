let LpMining = artifacts.require("LpMining");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let reward = web3.utils.toWei("2000", "ether");  // cws
let period = 2000;
let generation = 1;

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

	let lpMining = await LpMining.at("0x8285dA17bF2a18369CC2a15e4F4Db68b9E7C0622");
	//let factory = await Factory.at("0x3eB88c3F2A719369320D731FbaE062b0f82F22e4");
	//let nft     = await Nft.at("0x66638F4970C2ae63773946906922c07a583b6069");
	let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");	
    let lpTokenAddress = "0xdc935332d39a4c632864dbbed3cfdbf049fb9267";

    //let nftGranted = await nft.setFactory(factory.address);
    //console.log("Nft has been linked to factory: "+nftGranted.tx);

    //await factory.addStaticUser(lpMining.address);
    //console.log("2/2 Staking contract got a permission");
    
    // should transfer reward amount to contract
    //await crowns.transfer(lpMining.address, reward, {from: accounts[0]});
    //console.log("Crowns for session were transferred to the Lp Mining smartcontract");

    let startTime = Math.floor(new Date().getTime()/1000) + 30;
    await lpMining.startSession(lpTokenAddress, reward, period, startTime, generation);
    console.log("Session started");

    let sessionId = await lpMining.lastSessionIds.call(lpTokenAddress);
    console.log(sessionId +" session id for "+lpTokenAddress);
    
    return true;
}.bind(this);

