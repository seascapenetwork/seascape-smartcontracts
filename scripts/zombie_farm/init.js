let ZombieFarm = artifacts.require("ZombieFarm");
let ScapeNftReward = artifacts.require("ScapeNftReward");
let SingleTokenChallenge = artifacts.require("SingleTokenChallenge");
let Factory = artifacts.require("NftFactory");
let Crowns = artifacts.require("CrownsToken");

let accounts;
let interval = 120;  // 0.5 minutes
let period = 3600 * 24;   // 1 day 
let generation = 0;
let nftFactoryAddress = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";    
let crownsAddress = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    console.log("Calling the init function...")
    let res = await init();
    
    callback(null, res);
};

let init = async function() {
    console.log("account is setting..")
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let zombieFarm = await ZombieFarm.deployed();    
    let scapeNftReward = await ScapeNftReward.deployed();    
    console.log("ZombieFarm instances created");

    let factory = await Factory.at(nftFactoryAddress).catch(e => console.log(e));
    let crowns = await Crowns.at(crownsAddress).catch(e => console.error(e));

    console.log("Contracts initiated");

    //let isGiven = await factory.isGenerator(scapeNftReward.address).catch(e => console.error(e));
    //if (!isGiven) {
    //    await factory.addGenerator(scapeNftReward.address);
    //    console.log("ZombieFarm was granted a permission by factory to mint Seascape NFT!");
    //}
    //console.log("Generator was set");

    //await zombieFarm.addSupportedReward(scapeNftReward.address);
    //console.log("Added ScapeNFT Reward to ZombieFarm");

    let period = 604800;
    let wei = web3.utils.toWei((100).toString(), "ether");
    let grandId = 1;

    let quality = 5;
    let generation = 0;
    let imgId = 35;
    let levelAmount = 4;

    //await crowns.approve(zombieFarm.address, web3.utils.toWei((100000).toString(), "ether"));
    //console.log("Approved the grand rewards");

    let startTime = Math.floor(Date.now()/1000) + 180;

    let rewardData = web3.eth.abi.encodeParameters(
        ['uint256', 'uint256', 'uint8', 'address', 'uint256'],
        [imgId, generation, quality, crowns.address, wei]
      );

    await zombieFarm.startSession(startTime, period, grandId, rewardData, levelAmount, {from: accounts[0], gasPrice: 136000000000});

    sessionId = await zombieFarm.lastSessionId();
    console.log(sessionId +" session id started");
}.bind(this);
