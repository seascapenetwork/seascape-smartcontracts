var ZombieFarm = artifacts.require("./ZombieFarm.sol");
var Factory = artifacts.require("./NftFactory.sol");
var ScapeNftReward = artifacts.require("./ScapeNftReward.sol");
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

  // imported contracts
  let zombieFarm = null;
  let scapeNftReward = null;
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


  // before player starts, need a few things prepare.
  // one of things to allow nft to be minted by nft factory
  it("1. should link nft factory and scape nft reward", async () => {
    zombieFarm = await ZombieFarm.deployed();
    factory = await Factory.deployed();
    nft = await Nft.deployed();
    scapeNftReward = await ScapeNftReward.deployed();
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
    let startTime = Math.floor(Date.now()/1000) + 3;

    let wei = web3.utils.toWei((grandAmound * 100).toString(), "ether");

    crowns = await Crowns.deployed();
    await crowns.approve(zombieFarm.address, wei, {from: gameOwner});

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
});
