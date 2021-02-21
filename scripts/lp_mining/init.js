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

	let lpMining = await LpMining.at("0x38C548F3E1168FC7379360C14e9236C914745650");
	let factory = await Factory.at("0x3eB88c3F2A719369320D731FbaE062b0f82F22e4");
	//let nft     = await Nft.at("0x66638F4970C2ae63773946906922c07a583b6069");
	let crowns  = await Crowns.at("0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B");	
    let lpTokenAddress = "0xd57fa6d26adde2645fcd8d58e9dbc52a11161877";

    await factory.addStaticUser(lpMining.address);
    console.log("2/2 Staking contract got a permission");

    // should transfer reward amount to contract
    await crowns.transfer(lpMining.address, reward, {from: accounts[0]});
    console.log("Crowns for session were transferred to the Lp Mining smartcontract");

    let startTime = Math.floor(new Date().getTime()/1000) + 80;
    await lpMining.startSession(lpTokenAddress, reward, period, startTime, generation);
    console.log("Session started");

    let sessionId = await lpMining.lastSessionIds.call(lpTokenAddress);
    console.log(sessionId +" session id for "+lpTokenAddress);
    
    return true;
}.bind(this);

