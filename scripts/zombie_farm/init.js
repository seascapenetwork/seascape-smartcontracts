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
let speedUpFee = web3.utils.toWei((10).toString(), "ether");
let repickFee = web3.utils.toWei((1).toString(), "ether");

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
    let gameOwner = accounts[0];

    let zombieFarm = await ZombieFarm.at("0xf231e63701AF8a325bC041b5aB79c94B06c21e4D");    
    let scapeNftReward = await ScapeNftReward.at("0x3B1c875bE0431C49BEdD440f99aD29Ef1225230D");    
    let singleTokenChallenge = await SingleTokenChallenge.at("0x234fDF5E571f1fFcCf691F65F8E4D80b110b1aF3");
    console.log("ZombieFarm contract instances created");

    let factory = await Factory.at(nftFactoryAddress).catch(e => console.log(e));
    let crowns = await Crowns.at(crownsAddress).catch(e => console.error(e));

    console.log("Contracts initiated");

    // let isGiven = await factory.isGenerator(scapeNftReward.address).catch(e => console.error(e));
    // if (!isGiven) {
    //    await factory.addGenerator(scapeNftReward.address);
    //    console.log("ZombieFarm was granted a permission by factory to mint Seascape NFT!");
    // }
    // console.log("Generator was set");

    // await zombieFarm.addSupportedReward(scapeNftReward.address);
    // console.log("Added ScapeNFT Reward to ZombieFarm");

    let period = 3600 * 24 * 7;
    let wei = web3.utils.toWei((100).toString(), "ether");
    let grandId = 1;

    let quality = 5;
    let generation = 0;
    let imgId = 35;
    let levelAmount = 3;

    // let approveAmount = web3.utils.toWei((100000000).toString(), "ether");
    // try {
    //     await crowns.approve(scapeNftReward.address, approveAmount, {from: gameOwner});
    //     await crowns.approve(singleTokenChallenge.address, approveAmount, {from: gameOwner});
    //     await crowns.approve(zombieFarm.address, approveAmount, {from: gameOwner});
    //     console.log("Approved the grand rewards");
    // } catch (e) {
    //     console.error(e);
    // }


    sessionId = await zombieFarm.lastSessionId();
    console.log(sessionId +" session id started");
    let session = await zombieFarm.sessions(sessionId);
    console.log(session);

    // let startTime = Math.floor(Date.now()/1000) + 180;

    // let rewardData = web3.eth.abi.encodeParameters(
    //     ['uint256', 'uint256', 'uint8', 'address', 'uint256'],
    //     [imgId, generation, quality, crowns.address, wei]
    //   );

    // try {
    // await zombieFarm.startSession(startTime, period, grandId, rewardData, levelAmount, speedUpFee, repickFee, {from: accounts[0], gasPrice: 136000000000});
    // }
    // catch (e) {
    //     console.log(e);
    // }

    sessionId = await zombieFarm.lastSessionId();
    console.log(sessionId +" session id started");

    /////////////////////////////////////////////////////////////////
    //
    // Supported Challenges
    //
    /////////////////////////////////////////////////////////////////
    // let earn = crowns.address;
    // let stake = crowns.address;
    // let challengeData = web3.eth.abi.encodeParameters(
    //   ['address', 'address'],
    //   [earn, stake]
    // );

    // await zombieFarm.addSupportedChallenge(singleTokenChallenge.address, challengeData);
    // await zombieFarm.addSupportedChallenge(singleTokenChallenge.address, challengeData);
    // await zombieFarm.addSupportedChallenge(singleTokenChallenge.address, challengeData);
    // console.log("Added supported challenges");

    //////////////////////////////////////////////////////////////////
    //
    // Add level rewards
    //
    ///////////////////////////////////////////////////////////////////
    let rewardPool = 100;
    let rewardPoolWei = web3.utils.toWei(rewardPool.toString(), "ether");
    // let rewardId = 1;

    // //uint8[5] memory levelId, uint256[5]  imgId, uint256[5]  generation, uint8[5]  quality, address[5]  token, uint256[5]  amount;
    // let data = web3.eth.abi.encodeParameters(
    //   ['uint8[5]', 'uint256[5]', 'uint256[5]', 'uint8[5]', 'address[5]', 'uint256[5]'],
    //   [
    //     [1, 2, 3, 4, 0], 
    //     [imgId, imgId + 1, imgId -1, imgId + 2, 0], 
    //     [generation, generation, generation, generation, 0], 
    //     [quality, 1, 2, 3, 0], 
    //     [crowns.address, crowns.address, crowns.address, crowns.address, zombieFarm.address], 
    //     [rewardPoolWei, rewardPoolWei, rewardPoolWei, rewardPoolWei, 0]
    //   ]
    // );
    // console.log(data);

    // //addCategoryRewards(uint8 sessionId, uint8 rewardAmount, uint16 rewardId, bytes calldata data)
    // try {
    //     await zombieFarm.addCategoryRewards(sessionId, levelAmount, rewardId, data);
    //     console.log("All level rewards were added");
    // } catch(e) {
    //     console.log(e);
    // }

    ///////////////////////////////////////////////////////////////////////////////////
    //
    // Add Level Challenges
    //
    ///////////////////////////////////////////////////////////////////////////////////
    let challengesAmount = 3;
    let challengeId = 1;

    let stakeAmount = 20;
    let stakePeriod = 3600 * 5;
    let stakeAmountWei = web3.utils.toWei(stakeAmount.toString(), "ether");
    let multiply = parseInt(10 * 10000);

    let prevChallengeId = 0;

    // challenge id, level id, reward, stakeAmount, stakePeriod, min, max;
    let levelChallengeData = web3.eth.abi.encodeParameters(
      ['uint32[5]', 'uint8[5]', 'uint256[5]', 'uint256[5]', 'uint256[5]', 'uint256[5]', 'uint32[5]'],
      [[challengeId, challengeId + 1, challengeId + 2, 0, 0], [1, 1, 1, 0, 0], [rewardPoolWei, rewardPoolWei, rewardPoolWei, 0, 0],
      [stakeAmountWei, stakeAmountWei, stakeAmountWei, 0, 0], [stakePeriod, stakePeriod, stakePeriod, 0, 0], 
      [multiply, multiply, multiply, 0, 0], [prevChallengeId, prevChallengeId, prevChallengeId, 0, 0]]
    );

    let nonActive = await zombieFarm.sessionChallenges(sessionId, challengeId);
    let nonActive1 = await zombieFarm.sessionChallenges(sessionId, challengeId + 1);
    let nonActive2 = await zombieFarm.sessionChallenges(sessionId, challengeId + 2);

    await zombieFarm.addChallenges(sessionId, challengesAmount, challengeId, levelChallengeData);

    let active = await zombieFarm.sessionChallenges(sessionId, challengeId);
    let active1 = await zombieFarm.sessionChallenges(sessionId, challengeId + 1);
    let active2 = await zombieFarm.sessionChallenges(sessionId, challengeId + 2);
    console.log("Challenges were added");
}.bind(this);
