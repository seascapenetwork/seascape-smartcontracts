const { assert } = require("chai");

var StakeToken            = artifacts.require("./StakeToken.sol");
var Crowns                = artifacts.require("./CrownsToken.sol");
var Lp                    = artifacts.require("./LpToken.sol");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

contract("Seascape Defi Staking", async accounts => {
  let key = 1;              // Each staking period has a unique key.

  //game data
  // session params
  let grandAmound = 100;
  let stakeAmount = 10;
  let startTime;
  let endTime;

  // imported contracts
  let stakeToken            = null;
  let crowns                = null;
  let lp                    = null;

  // interacting users
  let gameOwner             = null;
  let player                = null;

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
  it("1. should deploy smartcontracts", async () => {
    stakeToken            = await StakeToken.deployed().catch(console.error);
    crowns                = await Crowns.deployed().catch(console.error);
    lp                    = await Lp.deployed().catch(console.error);

    gameOwner             = accounts[0];
    player                = accounts[1];

    console.log(`Game Owner: ${gameOwner}, player ${player}`);
  });

  //does not wait a week to see if session is closed
  it("2. should start a staking period", async () => {
    let approveAmount = web3.utils.toWei((100000000).toString(), "ether");

    console.log(`[${new Date().toUTCString()}] Approving CWS to be managed by stake token contract`);
    await crowns.approve(stakeToken.address, approveAmount, {from: gameOwner});
    console.log(`[${new Date().toUTCString()}] approved CWS`);

    console.log(`[${new Date().toUTCString()}] Approving LP to be managed by stake token contract`);
    await lp.approve(stakeToken.address, approveAmount, {from: gameOwner});
    console.log(`[${new Date().toUTCString()}] approved LP`);


    let stakeTokenAddr    = lp.address;
    let rewardTokenAddr   = crowns.address;
    startTime         = Math.round(new Date().getTime() / 1000) + 2;
    endTime           = startTime + 100;        // 2 minutes
    let rewardPool        = web3.utils.toWei(grandAmound.toString(), "ether");
    
    console.log(`[${new Date().toUTCString()}] Starting a staking period`);
    await stakeToken.newPeriod(key, stakeTokenAddr, rewardTokenAddr, startTime, endTime, rewardPool);
    console.log(`[${new Date().toUTCString()}] new period started`);
  });

  it("3. player (account 2) should stake some LP", async () => {
    // stake(uint256 key, address stakerAddr, uint256 amount)
    let amount = web3.utils.toWei(stakeAmount.toString(), "ether");
    let amountMax = web3.utils.toWei("1000", "ether");

    console.log(`[${new Date().toUTCString()}] Transferring LP to the player's balance`);
    await lp.transfer(player, amountMax, {from: gameOwner});
    console.log(`[${new Date().toUTCString()}] transferred some LP`);

    console.log(`[${new Date().toUTCString()}] Approving stake token contract to spend player's LP`);
    await lp.approve(stakeToken.address, amountMax, {from: player});
    console.log(`[${new Date().toUTCString()}] approved`);

    console.log(`[${new Date().toUTCString()}] Staking some LP on behalf of the user`);
    await stakeToken.stake(key, player, amount, {from: gameOwner});
    console.log(`[${new Date().toUTCString()}] player has staked`);
  });

  it("4. player (account 2) should should have some tokens to claim", async () => {
    let stakePeriod = await stakeToken.stakePeriods(gameOwner, key).catch(console.error);
    let stakeUser = await stakeToken.stakeUsers(gameOwner, key, player).catch(console.error);

    console.log(`Staking period`);
    console.log(JSON.parse(JSON.stringify(stakePeriod)));
    console.log(`Staking user`);
    console.log(JSON.parse(JSON.stringify(stakeUser)));
    console.log(`[${new Date().toUTCString()}] checking claimables`);

    while (true) {
      let now = Math.round(new Date().getTime() / 1000);
      if (now > endTime) {
        return;
      }
      let claimable = await stakeToken.claimable(gameOwner, key, player);
      console.log(`[${new Date().toUTCString()}]`);
      console.log(`[${now - startTime}/${endTime - startTime}] player can claim ${web3.utils.fromWei(claimable)}`);
      await sleep(1000);

      stakePeriod = await stakeToken.stakePeriods(gameOwner, key).catch(console.error);
      stakeUser = await stakeToken.stakeUsers(gameOwner, key, player).catch(console.error);
    }
  });

});
