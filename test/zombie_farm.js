const { assert } = require("chai");

var ZombieFarm = artifacts.require("./ZombieFarm.sol");
var Factory = artifacts.require("./NftFactory.sol");
var ScapeNftReward = artifacts.require("./ScapeNftReward.sol");
var SingleTokenChallenge = artifacts.require("./SingleTokenChallenge.sol");
var Nft = artifacts.require("./SeascapeNft.sol");
var Crowns = artifacts.require("./CrownsToken.sol");

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

contract("Game 5: Zombie Farm", async accounts => {

  //game data
  let period = 604800;
  let generation = 0;
  let grandAmound = 100;
  let grandId = 1;
  let levelAmount = 4;
  let imgId = 45;
  let quality = 5;
  let rewardPool = 100;
  let stakeAmount = 20;
  let stakePeriod = 3600 * 5;


  // imported contracts
  let zombieFarm = null;
  let scapeNftReward = null;
  let singleTokenChallenge = null;
  let factory = null;
  let nft = null;
  let crowns = null;

  //session & accounts data
  let lastSessionId = null;
  let player = null;
  let gameOwner = null;
  let signature = null;

  //token & slot data
  let index = 0;
  let nftId = 1;
  let sp = 100;
  let nftIdSlot = new Array(3);
  nftIdSlot.fill(0);

  //digital signatures
  async function signNft(nftId,sp) {
    //v, r, s related stuff
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],[nftId,sp]);
    let data = web3.utils.keccak256(bytes32);
    let hash = await web3.eth.sign(data, gameOwner);

    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
        v += 27;
    }
    return [v, r, s];
  }

  async function signBonus(bonusPercent, nftIdSlot1, nftIdSlot2, nftIdSlot3) {
    //v, r, s related stuff
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256", "uint256", "uint256"],
      [bonusPercent, nftIdSlot1, nftIdSlot2, nftIdSlot3]);
    let data = web3.utils.keccak256(bytes32);
    let hash = await web3.eth.sign(data, gameOwner);

    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
        v += 27;
    }
    return [v, r, s];
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // before player starts, need a few things prepare.
  // one of things to allow nft to be minted by nft factory
  it("1. should link nft factory and scape nft reward", async () => {
    zombieFarm = await ZombieFarm.deployed();
    factory = await Factory.deployed();
    nft = await Nft.deployed();
    scapeNftReward = await ScapeNftReward.deployed();
    singleTokenChallenge = await SingleTokenChallenge.deployed();
    crowns = await Crowns.deployed();

    gameOwner = accounts[0];
    player = accounts[1];

    await nft.setFactory(factory.address, {from: gameOwner});
    await factory.addGenerator(scapeNftReward.address, {from: gameOwner});
  });

  it("2. should add scape nft reward to zombie farm", async () => {
    let initialAmount = await zombieFarm.supportedRewardsAmount();
    
    await zombieFarm.addSupportedReward(scapeNftReward.address);

    let amount = await zombieFarm.supportedRewardsAmount();
    let idToAddr = await zombieFarm.supportedRewards(1);
    let addrToId = await zombieFarm.rewardAddresses(scapeNftReward.address);
    
    assert.equal(initialAmount, 0, "initial amount");
    assert.equal(amount, 1, "amount after reward support");
    assert.equal(idToAddr, scapeNftReward.address, "reward address");
    assert.equal(addrToId, 1, "reward id");
  });

  //does not wait a week to see if session is closed
  it("3. should start a game session (event) for 1 week", async () => {
    let startTime = Math.floor(Date.now()/1000) + 5;

    let wei = web3.utils.toWei((grandAmound * 100000).toString(), "ether");

    crowns = await Crowns.deployed();
    await crowns.approve(zombieFarm.address, wei, {from: gameOwner});
    await crowns.approve(singleTokenChallenge.address, wei, {from: gameOwner});

    // imgId, generation, quality, token, amount
    let rewardData = web3.eth.abi.encodeParameters(
      ['uint256', 'uint256', 'uint8', 'address', 'uint256'],
      [imgId, generation, quality, crowns.address, wei]
    );

    await zombieFarm.startSession(startTime, period, grandId, rewardData, levelAmount);

    lastSessionId = await zombieFarm.lastSessionId();
    assert.equal(lastSessionId, 1, "session id is expected to be 1");
  });

  it("4. starting a session while there is another session should fail", async () => {
    let startTime = Math.floor(Date.now()/1000) + 3;

    let wei = web3.utils.toWei((grandAmound * 100).toString(), "ether");

    // imgId, generation, quality, token, amount
    let rewardData = web3.eth.abi.encodeParameters(
      ['uint256', 'uint256', 'uint8', 'address', 'uint256'],
      [imgId, generation, quality, crowns.address, wei]
    );

    try{
      await zombieFarm.startSession(startTime, period, grandId, rewardData, levelAmount, {from: gameOwner});
    }catch(e){
      assert.equal(e.reason, "isActive");
    }
  });

  it("5. should add challenge types to the smartcontract", async () => {
    let earn = crowns.address;
    let stake = crowns.address;
    let challengeData = web3.eth.abi.encodeParameters(
      ['address', 'address'],
      [earn, stake]
    );

    let preId = await zombieFarm.supportedChallengesAmount();

    await zombieFarm.addSupportedChallenge(singleTokenChallenge.address, challengeData);

    let id = await zombieFarm.supportedRewardsAmount();
    let challengeAddress = await zombieFarm.supportedChallenges(id);

    assert.equal(preId, 0, "challenges should be 0");
    assert.equal(id, 1, "challenges should be 1 after addition");
    assert.equal(challengeAddress, singleTokenChallenge.address, "challenge is not single token challenge");
  });

  it("6. should add challenge to the level", async () => {
    let challengesAmount = 1;
    let sessionId = 1;
    let challengeId = 1;
    let wei = web3.utils.toWei(rewardPool.toString(), "ether");

    let stakeAmountWei = web3.utils.toWei(stakeAmount.toString(), "ether");
    let multiply = parseInt(10 * 10000);

    let prevChallengeId = 0;

    // challenge id, level id, reward, stakeAmount, stakePeriod, min, max;
    let data = web3.eth.abi.encodeParameters(
      ['uint32[5]', 'uint8[5]', 'uint256[5]', 'uint256[5]', 'uint256[5]', 'uint256[5]', 'uint32[5]'],
      [[challengeId, 0, 0, 0, 0], [1, 0, 0, 0, 0], [wei, 0, 0, 0, 0],
      [stakeAmountWei, 0, 0, 0, 0], [stakePeriod, 0, 0, 0, 0], [multiply, 0, 0, 0, 0], [prevChallengeId, 0, 0, 0, 0]]
    );

    let nonActive = await zombieFarm.sessionChallenges(sessionId, challengeId);

    await zombieFarm.addChallenges(sessionId, challengesAmount, challengeId, data);

    let active = await zombieFarm.sessionChallenges(sessionId, challengeId);

    assert.equal(nonActive, false, "Should be non active");
    assert.equal(active, true, "Should be active");
  });

  it("7. should stake some token", async () => {
    // stake(uint256 sessionId, uint32 challengeId, bytes calldata data)

    let amount = web3.utils.toWei("25", "ether");

    await crowns.transfer(player, amount, {from: gameOwner});
    await crowns.approve(singleTokenChallenge.address, amount, {from: player});

    let sessionId = 1;
    let challengeId = 1;
    let data = web3.eth.abi.encodeParameters(['uint256'], [amount]);

    let beforeSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);

    await zombieFarm.stake(sessionId, challengeId, data, {from: player});

    let afterSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);
    let playerData = await singleTokenChallenge.playerParams(sessionId, challengeId, player);
    assert.equal(web3.utils.fromWei(playerData.amount), 20, "after staking amount should be 20");
    assert.equal(web3.utils.fromWei(beforeSession.amount), 0, "before session amount should be 0");
    assert.equal(web3.utils.fromWei(afterSession.amount), web3.utils.fromWei(afterSession.stakeAmount), "after session amount should be session.stakeAmount");
  });

  it("8. should unstake some token", async () => {
    let amount = web3.utils.toWei("3", "ether");

    let sessionId = 1;
    let challengeId = 1;
    let data = web3.eth.abi.encodeParameters(['uint256'], [amount]);

    let prevPlayer = await singleTokenChallenge.playerParams(sessionId, challengeId, player);

    await zombieFarm.unstake(sessionId, challengeId, data, {from: player});

    let afterPlayer = await singleTokenChallenge.playerParams(sessionId, challengeId, player);
    let afterSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);

    assert.equal(web3.utils.fromWei(prevPlayer.amount), 20, "Previous amount should be 20");
    assert.equal(web3.utils.fromWei(prevPlayer.overStakeAmount), 5, "Previous over stake amount should be 5");
    assert.equal(web3.utils.fromWei(afterPlayer.amount), 20, "after amount should be 20");
    assert.equal(web3.utils.fromWei(afterPlayer.overStakeAmount), 2, "after over stake amount should be 2");
    assert.equal(web3.utils.fromWei(afterSession.amount), web3.utils.fromWei(afterSession.stakeAmount), "after session amount should be session.stakeAmount");
  });

  it("9. should claim earned tokens", async () => {
    let data = "0x00";
    let sessionId = 1;
    let challengeId = 1;

    let beforeSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);

    await sleep(2000);

    await zombieFarm.claim(sessionId, challengeId, data, {from: player});

    let afterSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);

    assert.notEqual(parseFloat(web3.utils.fromWei(beforeSession.claimed)), parseFloat(web3.utils.fromWei(afterSession.claimed)), "after claiming, the claimed amount should increase");
  });

  it("10. should unstake after time progress and complete", async () => {
    /// Stake more to speed up the time progress
    let amount = web3.utils.toWei("2500", "ether");

    await crowns.transfer(player, amount, {from: gameOwner});
    await crowns.approve(singleTokenChallenge.address, amount, {from: player});

    let sessionId = 1;
    let challengeId = 1;
    let data = web3.eth.abi.encodeParameters(['uint256'], [amount]);

    await zombieFarm.stake(sessionId, challengeId, data, {from: player});

    let beforeSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);
    assert.equal(web3.utils.fromWei(beforeSession.amount), web3.utils.fromWei(beforeSession.stakeAmount), "adding more tokens over stakeAmount by the same player, should not change total staked token amount");

    let prevPlayer = await singleTokenChallenge.playerParams(sessionId, challengeId, player);

    // wait for 3 seconds to increase time progress
    await sleep(3000);

    let unstakeAmount = web3.utils.toWei("3", "ether");
    let unstakeData = web3.eth.abi.encodeParameters(['uint256'], [unstakeAmount]);

    await zombieFarm.unstake(sessionId, challengeId, unstakeData, {from: player});

    let afterPlayer = await singleTokenChallenge.playerParams(sessionId, challengeId, player);
    let afterSession = await singleTokenChallenge.sessionChallenges(sessionId, challengeId);

    assert.equal(web3.utils.fromWei(prevPlayer.amount), "20", "Previous amount should be 20");
    assert.equal(web3.utils.fromWei(prevPlayer.overStakeAmount), "2502", "Previous over stake amount should be 2502");
    assert.equal(prevPlayer.completed, false, "Previous state of time progress should be not completed");
    assert.equal(web3.utils.fromWei(afterPlayer.amount), "0", "after amount should be 0");
    assert.equal(web3.utils.fromWei(afterPlayer.overStakeAmount), "0", "after over stake amount should be 0");
    assert.equal(afterPlayer.completed, true, "after state of time progress should be completed");
    assert.equal(web3.utils.fromWei(afterSession.amount), 0, "after session amount should be 0");

  });
});
