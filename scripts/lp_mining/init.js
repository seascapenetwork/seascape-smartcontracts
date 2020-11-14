let Staking = artifacts.require("Staking");
let LpToken = artifacts.require("LP_Token");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNFT");
let Factory = artifacts.require("NFTFactory");

let accounts;
let reward = web3.utils.toWei("200", "ether");  // cws
let period = 3600 * 24 * 7;   // 1 week
let generation = 0;
let lpTokenAddress = "0xab536d187f9ba03476438cb40928537b077b74b8";

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

    let staking = await Staking.deployed();
    let factory = await Factory.deployed();
    let nft     = await Nft.deployed();

    let crowns  = await Crowns.deployed();
	
    /*if (networkId == 4) {
	crowns = await Crowns.at(process.env.CROWNS_RINKEBY);
    } else {
	crowns = await Crowns.deployed();
    }*/
    
    // should transfer reward amount to contract
    await crowns.transfer(staking.address, reward, {from: accounts[0]});
    console.log("Crowns for session were transferred to the Lp Mining smartcontract");

    let startTime = Math.floor(new Date().getTime()/1000) + 30;
    await staking.startSession(lpTokenAddress, reward, period, startTime, generation);
    console.log("Session started");

    await staking.setNFTFactory(factory.address);
    console.log("Nft factory was linked to Lp Mining smartcontract");

    await nft.setFactory(factory.address);
    console.log("Nft factory was linked to Nft");

    await factory.addStaticUser(staking.address);
    console.log("Staking contract got a permission");

    return true;
}.bind(this);

