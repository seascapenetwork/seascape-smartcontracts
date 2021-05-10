var NftStaking = artifacts.require("./NftStaking.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");


function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}


contract("Game 3: Nft Staking", async accounts => {
  //game data
  let period = 604800;
  let generation = 0;
  let totalReward = web3.utils.toWei("10", "ether");;
  let depositAmount = web3.utils.toWei("30", "ether");
  let bonusPercent = 10;

  // imported contracts
  let nftStaking = null;
  let crowns = null;
  let factory = null;
  let nft = null;

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

    let quality = getRandomInt(5) + 1;
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

    let quality = getRandomInt(5) + 1;
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
  it("1. should link nft, nft factory and nft staking contracts", async () => {
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


  it("3. should mint 8 nft tokens", async () => {
    //check nft user balance before
    let balanceBefore = await nft.balanceOf(player);

    //mint.js
    web3.eth.getAccounts(function(err,res) {accounts = res;});
    let granted = await factory.isGenerator(accounts[0]);
    if (!granted) {
        let res = await factory.addGenerator(accounts[0]);
    } else {
      //replace with throw errror
	     console.log(`Account ${accounts[0]} was already granted a permission`);
    }
    let owner = player;
    let generation = 0;
    let quality = 1;
    //mint 2 tokens of each quality
    for(var i = 0; i < 8; i++){
      await factory.mintQuality(owner, generation, quality+Math.floor(i/2));
    }

    //check nft user balance after
    let balanceAfter = await nft.balanceOf(player);
    assert.equal(parseInt(balanceAfter), parseInt(balanceBefore)+8, "8 Nft tokens should be minted");
  });

  it("4. passing a bonus when not all slots are full should fail", async () => {
    //deposit one nft
    nftId++;
    signature = await signNft(nftId,sp);
    await nft.approve(nftStaking.address, nftId);
    await nftStaking.deposit(lastSessionId, nftId, sp, signature[0], signature[1], signature[2],
      {from: player});
    balanceAfter = await nftStaking.balances(lastSessionId, player, index);
    nftIdSlot[index] = parseInt(balanceAfter.nftId);

    //claimAll
    try{
      signature = await signBonus(bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]);
      await nftStaking.claimAll(lastSessionId, bonusPercent, signature[0], signature[1], signature[2],
        {from: player});
      nftIdSlot.fill(0);
    }catch(e){
      console.log("There was a problem with claimAll function.");
    }

    //check that the slots are empty
    for(index = 0; index < 3 ; index++){
      balanceAfter = await nftStaking.balances(lastSessionId, player, index);
      nftIdSlot[index] = parseInt(balanceAfter.nftId);
      assert.equal(balanceAfter.nftId, 0, "There should be no nft in slot " +index);
    }
  });

  it("5. claiming a bonus, but signature is signed by non-contract owner should fail", async () => {
    //deposit three nfts
    for(index=0; index<3; index++){
        //only deposit if slot is empty
        if(nftIdSlot[index] == 0){
        nftId++;
        signature = await signNft(nftId,sp);
        await nft.approve(nftStaking.address, nftId);
        await nftStaking.deposit(lastSessionId, nftId, sp, signature[0], signature[1], signature[2],
          {from: player});
        balanceAfter = await nftStaking.balances(lastSessionId, player, index);
        nftIdSlot[index] = parseInt(balanceAfter.nftId);
      }
    }

    //sign bonus as non-game owner
    let quality = getRandomInt(5) + 1;
    //v, r, s related stuff
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256", "uint256", "uint256"],
      [bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]]);
    let data = web3.utils.keccak256(bytes32);
    let hash = await web3.eth.sign(data, accounts[0]);

    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
        v += 27;
    }

    //claimAll
    try{
      await nftStaking.claimAll(lastSessionId, bonusPercent, v, r, s, {from: player});
      nftIdSlot.fill(0);
      assert.fail;
    }catch(e){
      assert(true);
    }
  });

  it("6. bonus should pass when all slots are full", async () => {
    //deposit three nfts
    for(index=0; index<3; index++){
      //only deposit if slot is empty
      if(nftIdSlot[index] == 0){
        nftId++;
        signature = await signNft(nftId,sp);
        await nft.approve(nftStaking.address, nftId);
        await nftStaking.deposit(lastSessionId, nftId, sp, signature[0], signature[1], signature[2],
          {from: player});
        balanceAfter = await nftStaking.balances(lastSessionId, player, index);
        nftIdSlot[index] = parseInt(balanceAfter.nftId);
      }
    }

    //claimAll
    try{
      signature = await signBonus(bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]);
      await nftStaking.claimAll(lastSessionId, bonusPercent, signature[0], signature[1], signature[2],
        {from: player});
      nftIdSlot.fill(0);
    }catch(e){
      console.log("There was a problem with claimAll function.");
    }

    //check that the slots are empty
    for(index = 0; index < 3 ; index++){
      balanceAfter = await nftStaking.balances(lastSessionId, player, index);
      nftIdSlot[index] = parseInt(balanceAfter.nftId);
      assert.equal(balanceAfter.nftId, 0, "There should be no nft in slot " +index);
    }
  });

});
