var NftStaking = artifacts.require("./NftStaking.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");



contract("Game 3: Nft Staking", async accounts => {

  // let interval = 5;  // seconds
  let period = 604800;   // in a week    2. startSession
  let generation = 0; //2. startSeassion
  let totalReward = web3.utils.toWei("10", "ether");; //2. startSeassion
  let depositAmount = web3.utils.toWei("30", "ether");

  let rewardUnit = web3.utils.toWei("1", "milli");    // reward per second = totalReward/period





  // let spentDailyReward = web3.utils.toWei("110", "ether");
  // let spentAlltimeReward = web3.utils.toWei("110", "ether");
  // let mintedDailyReward = web3.utils.toWei("110", "ether");
  // let mintedAlltimsReward = web3.utils.toWei("110", "ether");
  // let totalReward = parseInt(spentDailyReward) + parseInt(spentAlltimeReward) + parseInt(mintedDailyReward) + parseInt(mintedAlltimsReward);
  // let rewardsAmounts = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2];

  // following vars used in multiple test units:
  let nftStaking = null;
  let crowns = null;
  let factory = null;
  let nft = null;

  let lastSessionId = null;
  let player = null;
  let gameOwner = null;

  // before player starts, need a few things prepare.
  // one of things to allow nft to be minted by nft factory
  it("0. should link nft, nft factory and nft staking contracts", async () => {
    nftStaking = await NftStaking.deployed();
    factory = await Factory.deployed();
    nft = await Nft.deployed();
    gameOwner = accounts[0];

    await nft.setFactory(factory.address);
    await factory.addGenerator(nftStaking.address, {from: gameOwner});
  });

  //does not wait a week to see if session is closed
  it("2. should start a game session (event) for 1 week", async () => {
    player = accounts[0];

    let startTime = Math.floor(Date.now()/1000) + 5;

    crowns = await Crowns.deployed();
    await crowns.transfer(nftStaking.address, depositAmount, {from: player});


    await nftStaking.startSession(totalReward, period,  startTime, generation, {from: player});


    lastSessionId = await nftStaking.lastSessionId();
    assert.equal(lastSessionId, 1, "session id is expected to be 1");
  });


  it("3. starting a session while there is another session should fail", async () => {

    let startTime = Math.floor(Date.now()/1000) + 5;

    try{
      await nftStaking.startSession(totalReward, period,  startTime, generation, {from: player});
    }catch(e){
      assert.equal(e.reason, "Seascape Staking: Can't start when session is active", "startSession() should return an error.");
    }

  });

  // it("4. Should mint nft tokens", async () => {
  //   let minted nft = mint.init()

  // it("4. should deposit first nft to game contract (deposit method)", async () => {
  //
  //   let nftId = 5;
  //   let sp = 200;
  //   //lastSessionId=1;
  //
  //   //balance
  //   //should probably deposit some money before
  //   let balance = await nftStaking.balances(lastSessionId, player);
  //
  //
  //   let quality = getRandomInt(5) + 1;
  //   //v, r, s related stuff
  //   let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
  //                  [web3.utils.toWei(web3.utils.fromWei(balance.amount)),
  //                   parseInt(balance.claimedTime.toString())]);
  //   let bytes1 = web3.utils.bytesToHex([quality]);
  //   let str = player + bytes32.substr(2) + bytes1.substr(2);
  //
  //
  //   let data = web3.utils.keccak256(str);
  //   let hash = await web3.eth.sign(data, gameOwner);
  //   let r = hash.substr(0,66);
  //   let s = "0x" + hash.substr(66,64);
  //   let v = parseInt(hash.substr(130), 16);
  //   if (v < 27) {
  //       v += 27;
  //     }
  //
  //   await nftStaking.deposit(lastSessionId, nftId, sp, v, r, s, {from: player});
  //
  //
  //   let updatedBalance = await nftStaking.balances(lastSessionId, accounts[0]);
	//   assert.equal(updatedBalance.amount, 0, "deposit should be reset to 0");
  //   //nftId, sp

  // });




});
