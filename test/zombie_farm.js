const { assert } = require("chai");

var ZombieFarm            = artifacts.require("./ZombieFarm.sol");
var Factory               = artifacts.require("./NftFactory.sol");
var ScapeNftReward        = artifacts.require("./ScapeNftReward.sol");
var SingleTokenChallenge  = artifacts.require("./SingleTokenChallenge.sol");
var Nft                   = artifacts.require("./SeascapeNft.sol");
var Crowns                = artifacts.require("./CrownsToken.sol");
var Lp                = artifacts.require("./LpToken.sol");

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

contract("Game 5: Zombie Farm", async accounts => {
  //game data
  // session params
  let period      = 180;
  let levelAmount = 1;
  let speedUpFee = web3.utils.toWei("1", "ether");
  let repickFee = web3.utils.toWei("0.1", "ether");
  // Grand reward
  let generation  = 0;
  let grandAmound = 100;
  // Single token staking parameter
  let imgId = 45;
  let quality = 5;
  let rewardPool = 100;
  let stakeAmount = 20;
  let stakePeriod = 3600 * 5;

  // imported contracts
  let zombieFarm            = null;
  let scapeNftReward        = null;
  let singleTokenChallenge  = [];
  let factory               = null;
  let nft                   = null;
  let crowns                = null;
  let lp                = null;

  //session & accounts data
  let lastSessionId         = null;
  let player                = null;
  let gameOwner             = null;

  // staking signature
  // sessionId, levelId, slotId, challenge, msg.sender
  async function signStake(sessionId, levelId, slotId, challenge, staker) {
    //v, r, s related stuff
    let bytes32 = web3.eth.abi.encodeParameters(["uint256"],[sessionId]);
    let bytes1_0 = web3.utils.bytesToHex([levelId]);
    let bytes1_1 = web3.utils.bytesToHex([slotId]);

    let str = bytes32 + bytes1_0.substr(2) + bytes1_1.substr(2) + challenge.substr(2) + staker.substr(2); 

    let data = web3.utils.keccak256(str);
    let hash = await web3.eth.sign(data, gameOwner);

    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
        v += 27;
    }
    return [v, r, s];
  }

  // encode bytes
  function encode(types, values) {
    return web3.eth.abi.encodeParameters(
      types, values
    );
  }

  // before player starts, need a few things prepare.
  // one of things to allow nft to be minted by nft factory
  it("1. should link nft factory and scape nft reward", async () => {
    zombieFarm            = await ZombieFarm.deployed().catch(console.error);
    factory               = await Factory.deployed().catch(console.error);
    nft                   = await Nft.deployed().catch(console.error);
    scapeNftReward        = await ScapeNftReward.deployed().catch(console.error);

    crowns                = await Crowns.deployed();
    lp                    = await Lp.deployed();
    let earnToken         = crowns.address;
    let stakeToken        = lp.address;

    gameOwner             = accounts[0];
    player                = accounts[1];

    singleTokenChallenge  = [
      await SingleTokenChallenge.new(zombieFarm.address, gameOwner, stakeToken, earnToken).catch(console.error),
      await SingleTokenChallenge.new(zombieFarm.address, gameOwner, stakeToken, earnToken).catch(console.error),
      await SingleTokenChallenge.new(zombieFarm.address, gameOwner, stakeToken, earnToken).catch(console.error)
    ];

    console.log(`Game Owner: ${gameOwner}, player ${player}`);

    await nft.setFactory(factory.address, {from: gameOwner});
    await factory.addGenerator(scapeNftReward.address, {from: gameOwner});
  });

  it("2. should add scape nft reward to zombie farm", async () => {
    let initialAmount     = await zombieFarm.supportedRewardsAmount().catch(console.error);

    await zombieFarm.supportReward(scapeNftReward.address).catch(console.error);

    let amount            = await zombieFarm.supportedRewardsAmount().catch(console.error);
    let supported         = await zombieFarm.supportedRewards(scapeNftReward.address).catch(console.error);

    assert.equal(initialAmount, 0,  "initial amount");
    assert.equal(amount, 1,         "amount after reward support");
    assert.equal(supported, true, "reward address");
  });

  //does not wait a week to see if session is closed
  it("3. should start a game session (event)", async () => {
    let wei = web3.utils.toWei(grandAmound.toString(), "ether");
    let approveAmount = web3.utils.toWei((100000000).toString(), "ether");

    await crowns.approve(zombieFarm.address, approveAmount, {from: gameOwner});
    await crowns.approve(scapeNftReward.address, approveAmount, {from: gameOwner});
    await crowns.approve(singleTokenChallenge[2].address, approveAmount, {from: gameOwner});
    await crowns.approve(singleTokenChallenge[1].address, approveAmount, {from: gameOwner});
    await crowns.approve(singleTokenChallenge[0].address, approveAmount, {from: gameOwner});

    await lp.approve(zombieFarm.address, approveAmount, {from: gameOwner});
    await lp.approve(scapeNftReward.address, approveAmount, {from: gameOwner});
    // To get out LP from the vault.
    await lp.approve(singleTokenChallenge[2].address, approveAmount, {from: gameOwner});
    await lp.approve(singleTokenChallenge[1].address, approveAmount, {from: gameOwner});
    await lp.approve(singleTokenChallenge[0].address, approveAmount, {from: gameOwner});

    let startTime = Math.floor(Date.now()/1000) + 10;

    // imgId, generation, quality, token, amount
    let rewardData = encode(['uint256', 'uint256', 'uint8', 'address', 'uint256'], [imgId, generation, quality, crowns.address, wei]);

    await scapeNftReward.addGrandToSession(1, rewardData);

    await zombieFarm.startSession(startTime, period, levelAmount, speedUpFee, repickFee, scapeNftReward.address);

    lastSessionId = await zombieFarm.lastSessionId();
    assert.equal(lastSessionId, 1, "session id is expected to be 1");
  });

  it("5. should add challenge types to the Zombie Farm", async () => {
    // adding two more to test the level
    await zombieFarm.supportChallenge(singleTokenChallenge[0].address);
    await zombieFarm.supportChallenge(singleTokenChallenge[1].address);
    await zombieFarm.supportChallenge(singleTokenChallenge[2].address);

    let added = await zombieFarm.supportedChallenges(singleTokenChallenge[0].address);

    assert.equal(added, true, "challenge was added");
  });

  it("6. should add rewards for all levels", async () => {
    let levelId   = 1;
    let sessionId = 1;
    let wei = web3.utils.toWei(rewardPool.toString(), "ether");

    // uint256, uint256, uint8, address, uint256
    let data = encode(
      ['uint256', 'uint256', 'uint8', 'address', 'uint256'],
      [imgId, generation, quality, crowns.address, wei]
    );

    //addCategoryRewards(uint8 sessionId, uint8 rewardAmount, uint16 rewardId, bytes calldata data)
    await zombieFarm.addLevelRewardToSession(sessionId, levelId, scapeNftReward.address, data);

    let rewardAddress = await zombieFarm.sessionRewards(sessionId, levelId);
    assert.equal(rewardAddress.toLowerCase(), scapeNftReward.address.toLowerCase(), "Reward is not session");
  });

  it("7. should add challenge to the level", async () => {
    let sessionId = 1;
    let levelId = 1;
    let wei = web3.utils.toWei(rewardPool.toString(), "ether");

    let stakeAmountWei = web3.utils.toWei(stakeAmount.toString(), "ether");
    let multiply = parseInt(10 * 10000);

    // challenge id, level id, reward, stakeAmount, stakePeriod, min, max;
    let data = encode(
      ['uint256', 'uint256', 'uint256', 'uint256'],
      [wei, stakeAmountWei, stakePeriod,multiply]
    );

    await zombieFarm.addChallengeToSession(sessionId, levelId, singleTokenChallenge[0].address, data);
    await zombieFarm.addChallengeToSession(sessionId, levelId, singleTokenChallenge[1].address, data);
    await zombieFarm.addChallengeToSession(sessionId, levelId, singleTokenChallenge[2].address, data);

    let added = await zombieFarm.sessionChallenges(sessionId, singleTokenChallenge[0].address);

    assert.equal(added, true, "not added");
  });

  it("8. should stake some token", async () => {
    // stake(uint256 sessionId, uint32 challengeId, bytes calldata data)
    let amount = web3.utils.toWei(stakeAmount.toString(), "ether");
    let amountMax = web3.utils.toWei("1000", "ether");

    await lp.transfer(player, amountMax, {from: gameOwner});
    await lp.approve(singleTokenChallenge[0].address, amountMax, {from: player});
    await lp.approve(singleTokenChallenge[1].address, amountMax, {from: player});
    await lp.approve(singleTokenChallenge[2].address, amountMax, {from: player});

    let sessionId = 1;
    let levelId = 1;

    let data_0 = encode(['uint256'], [amount]);
    let data_1 = encode(['uint256'], [amount]);
    let data_2 = encode(['uint256'], [amount]);

    let sig_0 = await signStake(sessionId, levelId, 0, singleTokenChallenge[0].address, player).catch(console.error);
    let sig_1 = await signStake(sessionId, levelId, 1, singleTokenChallenge[1].address, player).catch(console.error);
    let sig_2 = await signStake(sessionId, levelId, 2, singleTokenChallenge[2].address, player).catch(console.error);

    await zombieFarm.stake(sessionId, 0, singleTokenChallenge[0].address, sig_0[0], sig_0[1], sig_0[2], data_0, {from: player});
    await zombieFarm.stake(sessionId, 1, singleTokenChallenge[1].address, sig_1[0], sig_1[1], sig_1[2], data_1, {from: player});
    await zombieFarm.stake(sessionId, 2, singleTokenChallenge[2].address, sig_2[0], sig_2[1], sig_2[2], data_2, {from: player});
  });

  // it("9. should unstake some token", async () => {
  //   let amount = web3.utils.toWei("3", "ether");

  //   let sessionId = 1;
  //   let challengeId = 1;
  //   let data = web3.eth.abi.encodeParameters(['uint256'], [amount]);

  //   let prevPlayer = await singleTokenChallenge.playerParams(sessionId, challengeId, player);

  //   await zombieFarm.unstake(sessionId, challengeId, data, {from: player});

  //   let afterPlayer = await singleTokenChallenge.playerParams(sessionId, challengeId, player);
  //   let afterSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);

  //   assert.equal(web3.utils.fromWei(prevPlayer.amount), 20, "Previous amount should be 20");
  //   assert.equal(web3.utils.fromWei(prevPlayer.overStakeAmount), 5, "Previous over stake amount should be 5");
  //   assert.equal(web3.utils.fromWei(afterPlayer.amount), 20, "after amount should be 20");
  //   assert.equal(web3.utils.fromWei(afterPlayer.overStakeAmount), 2, "after over stake amount should be 2");
  //   assert.equal(web3.utils.fromWei(afterSession.amount), web3.utils.fromWei(afterSession.stakeAmount), "after session amount should be session.stakeAmount");
  // });

  // it("10. should claim earned tokens", async () => {
  //   let data = "0x00";
  //   let sessionId = 1;
  //   let challengeId = 1;

  //   let beforeSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);

  //   await sleep(2000);

  //   await zombieFarm.claim(sessionId, challengeId, {from: player});

  //   let afterSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);

  //   assert.notEqual(parseFloat(web3.utils.fromWei(beforeSession.claimed)), parseFloat(web3.utils.fromWei(afterSession.claimed)), "after claiming, the claimed amount should increase");
  // });

  it("11. should speed up earned tokens", async () => {
    let sessionId = 1;

    let totalAmount = web3.utils.toWei((2500).toString(), "ether");
    await crowns.transfer(player, totalAmount, {from: gameOwner});
    await crowns.approve(zombieFarm.address, totalAmount, {from: player});

    await zombieFarm.speedUp(sessionId, 0, singleTokenChallenge[0].address, {from: player});
    await zombieFarm.speedUp(sessionId, 1, singleTokenChallenge[1].address, {from: player});
    await zombieFarm.speedUp(sessionId, 2, singleTokenChallenge[2].address, {from: player});

    let completed = await singleTokenChallenge[0].isTimeCompleted(sessionId, player);
    let fullyCompleted = await singleTokenChallenge[0].isFullyCompleted(sessionId, player);

    assert.equal(completed, true, "should be marked as time progress completed");
    assert.equal(fullyCompleted, false, "should be marked as not fully completed");
  });

  // it("12. should repick the second stake", async () => {
  //   let sessionId = 1;
  //   let challengeId = 2;

  //   await crowns.approve(zombieFarm.address, repickFee, {from: player});

  //   await zombieFarm.repick(sessionId, challengeId, {from: player});
  // });

  it("13. should unstake after time progress and complete", async () => {
    let sessionId = 1;

    /// Stake more to speed up the time progress
    let amount = web3.utils.toWei(stakeAmount.toString(), "ether");
    let data = web3.eth.abi.encodeParameters(['uint256'], [amount]);

    await zombieFarm.unstake(sessionId, 0, singleTokenChallenge[0].address, data, {from: player});
    await zombieFarm.unstake(sessionId, 1, singleTokenChallenge[1].address, data, {from: player});
    await zombieFarm.unstake(sessionId, 2, singleTokenChallenge[2].address, data, {from: player});

    let param = await singleTokenChallenge[0].playerParams(sessionId, player);
    console.log(JSON.parse(JSON.stringify(param)));

    let completed = await singleTokenChallenge[0].isTimeCompleted(sessionId, player);
    console.log(`Completed the time? ${completed}`);
    let fullyCompleted = await singleTokenChallenge[0].isFullyCompleted(sessionId, player);
    assert.equal(fullyCompleted, true, "should be marked as not fully completed");
  });

  it("14. should reward user with level 1 loot box", async () => {
    let sessionId = 1;
    let levelId = 1;

    await zombieFarm.rewardLootBox(sessionId, levelId, {from: player});
  });

  it("15. should grand reward user", async () => {
    let sessionId = 1;
    let grandRewardType = 0;

    let beforeRewarded = await zombieFarm.playerRewards(sessionId, player, grandRewardType);

    await zombieFarm.rewardGrand(sessionId, {from: player});

    let afterRewarded = await zombieFarm.playerRewards(sessionId, player, grandRewardType);

    assert.equal(beforeRewarded, false, "shouldn't be rewarded with grand reward before rewarding");
    assert.equal(afterRewarded, true, "should be marked as rewarded after rewarding by grand reward");
  });
});
