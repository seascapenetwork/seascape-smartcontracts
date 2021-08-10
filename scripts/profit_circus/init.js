let ProfitCircus = artifacts.require("ProfitCircus");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let reward = web3.utils.toWei("20", "ether");  // cws
let period = 3600 * 24 * 1;
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
    accounts = await web3.eth.getAccounts();
    console.log(accounts)

	let profitCircus    = await ProfitCircus.at("0xa35abb86c53695bb1b23b55808b6c5871432c22c");
	let factory         = await Factory.at("0x25F4C38FAF75dF9622FECB17Fa830278cd732091");
	let crowns          = await Crowns.at("0xac0104cca91d167873b8601d2e71eb3d4d8c33e0");	
    let lpTokenAddress  = "0xac0104cca91d167873b8601d2e71eb3d4d8c33e0";

    console.log("Set the contracts");

    //await factory.addStaticUser(profitCircus.address).catch(console.error);
    //console.log("Profit Circus contract got a permission to mint nfts");

    // should transfer reward amount to contract
    await crowns.transfer(profitCircus.address, reward, {from: accounts[0]});
    console.log("Crowns for session were transferred to the Lp Mining smartcontract");

    let startTime = Math.floor(new Date().getTime()/1000) + 30;
    await profitCircus.startSession(lpTokenAddress, reward, period, startTime, generation);
    console.log("Session started");

    let sessionId = await profitCircus.lastSessionIds.call(lpTokenAddress);
    console.log(sessionId +" session id for "+lpTokenAddress);
    
    return true;
}.bind(this);

