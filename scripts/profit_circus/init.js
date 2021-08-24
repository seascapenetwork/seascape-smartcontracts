let ProfitCircus = artifacts.require("ProfitCircus");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let reward = web3.utils.toWei("20", "ether");  // cws
let period = 3600 * 24 * 7;
let generation = 1;

let stakeAmount = web3.utils.toWei("1", "ether"); // 1 LP token in ETHER format.
let stakePeriod = 3600;

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);

    callback(null, res);
};

let init = async function(networkId) {

    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    console.log("1");
    //rinkeby
    // let profitCircus    =  await ProfitCircus.at("0xfb96487f0dC8ecad503C5E575E1d23d837475f25");
    // let factory         = await Factory.at("0x3fd6Db81DD05e6054CBcddB0b2D4De37db2886d9");
  	// let crowns          = await Crowns.at("0xfC3C4136f8b2E19a6a759601D1aa4e29A8A502A1");
    // let lpTokenAddress  = await LpToken.at("0xb0CD1a0C95497d822780e763253A4532d6C63369");



    //moonbeam
  	let profitCircus    = await ProfitCircus.at("0x56787dAb8A2D207E65667c90400Ac74E368C6b0F");
  	let factory         = await Factory.at("0x06fddbD58cb286DC1e7a9eB50eF67c9215478670");
  	let crowns          = await Crowns.at("0x58Dc7b18D116208C9d1ECc45373A6b3B029566A8");
    let lpTokenAddress  = await LpToken.at("0xF9ADc1e9A0E4a476cbbd91511B97cDCD3438c01F");

    console.log("Set the contracts");

//     console.log("2");
//     await factory.addStaticUser(profitCircus.address).catch(console.error);
//     console.log("Profit Circus contract got a permission to mint nfts");
//
// console.log("3");
//     // should transfer reward amount to contract
//     await crowns.transfer(profitCircus.address, reward, {from: accounts[0]}).catch(console.error);
//     console.log("Crowns for session were transferred to the Lp Mining smartcontract");

console.log("4");
    let startTime = Math.floor(new Date().getTime()/1000) + 300;
    await profitCircus.startSession(lpTokenAddress.address, reward, period, startTime, generation, stakeAmount, stakePeriod)
      .catch(console.error);
    console.log("Session started");

console.log("5");
    let sessionId = await profitCircus.lastSessionIds.call(lpTokenAddress);
    console.log(sessionId +" session id for "+lpTokenAddress);

    return true;
}.bind(this);
