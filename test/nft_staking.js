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

  it("3. starting a session while there is another session should fail", async () => {
    let startTime = Math.floor(Date.now()/1000) + 5;

    try{
      await nftStaking.startSession(totalReward, period,  startTime, generation, {from: player});
    }catch(e){
      assert.equal(e.reason, "Seascape Staking: Can't start when session is active", "startSession() should return an error.");
    }
  });

  it("3.1 should mint 10 nft tokens", async () => {
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
    for(var i = 0; i < 10; i++){
      await factory.mintQuality(owner, generation, quality+Math.floor(i/2));
    }

    //check nft user balance after
    let balanceAfter = await nft.balanceOf(player);
    assert.equal(parseInt(balanceAfter), parseInt(balanceBefore)+10, "10 Nft tokens should be minted");
  });

  it("4. should deposit first nft to game contract (deposit method)", async () => {
    signature = await signNft(nftId,sp);

    //ERC721 approve and deposit token to contract
    await nft.approve(nftStaking.address, nftId);
      await nftStaking.deposit(lastSessionId, 0, nftId, sp, signature[0], signature[1], signature[2], {from: player});

    // check nft contract balance after
    balanceAfter = await nftStaking.balances(lastSessionId, player, index);
    nftIdSlot[index] = parseInt(balanceAfter.nftId);
	  assert.equal(balanceAfter.nftId, nftId, "Deposited nftId should be" +nftId);
  });

  it("5. should deposit second nft to game contract ", async () => {
    nftId++;
    index++;

    signature = await signNft(nftId,sp);

    //ERC721 approve and deposit token to contract
    await nft.approve(nftStaking.address, nftId);
      await nftStaking.deposit(lastSessionId, 1, nftId, sp, signature[0], signature[1], signature[2], {from: player});

    // check nft contract balance after
    balanceAfter = await nftStaking.balances(lastSessionId, player, index);
    nftIdSlot[index] = parseInt(balanceAfter.nftId);
    assert.equal(balanceAfter.nftId, nftId, "Deposited nftId should be" +nftId);
  });

  it("6. should deposit third nft to game contract ", async () => {
    nftId++;
    index++;

    signature = await signNft(nftId,sp);

    //ERC721 approve and deposit token to contract
    await nft.approve(nftStaking.address, nftId);
      await nftStaking.deposit(lastSessionId, 2, nftId, sp, signature[0], signature[1], signature[2], {from: player});

    // check nft contract balance after
    balanceAfter = await nftStaking.balances(lastSessionId, player, index);
    nftIdSlot[index] = parseInt(balanceAfter.nftId);
    assert.equal(balanceAfter.nftId, nftId, "Deposited nftId should be" +nftId);
  });

  it("7. depositing fourth nft should fail, as game has 3 slots only ", async () => {
    nftId++;

    signature = await signNft(nftId,sp);

    //ERC721 approve and deposit token to contract
    await nft.approve(nftStaking.address, nftId);
    try{
      //if deposit() doesnt fail, test should fail
	await nftStaking.deposit(lastSessionId, 3, nftId, sp, signature[0], signature[1], signature[2], {from: player});
      assert.fail;
    }catch{
      //if deposit() fails, the test should pass
      assert(true);
    }
  });

  it("8. should claim for first slot (claim method) ", async () => {
    index = 0;

    await nftStaking.claim(lastSessionId, index);

    balanceAfter = await nftStaking.balances(lastSessionId, player, index);
    nftIdSlot[index] = parseInt(balanceAfter.nftId);
    assert.equal(balanceAfter.nftId, 0, "There should be no nft in slot " +index)
  });

  it("9. claiming for first slot should fail, since it was claimed earlier ", async () => {
    try{
      //if claim() dont fail, test should fail
      await nftStaking.claim(lastSessionId, index);
      assert.fail;
    }catch{
      //if claim() fails, the test should pass
      assert(true);
    }

  });

  it("10. should claim for second slot ", async () => {
    index = 1;

    await nftStaking.claim(lastSessionId, index);

    balanceAfter = await nftStaking.balances(lastSessionId, player, index);
    nftIdSlot[index] = parseInt(balanceAfter.nftId);
    assert.equal(balanceAfter.nftId, 0, "There should be no nft in slot " +index);
  });

  it("11. claiming for second slot should fail, since it was claimed earlier ", async () => {
    try{
      //if claim() dont fail, test should fail
      await nftStaking.claim(lastSessionId, index);
      assert.fail;
    }catch{
      //if claim() fails, the test should pass
      assert(true);
    }
  });

  it("12. should claim for third slot ", async () => {
    index = 2;

    try{
      await nftStaking.claim(lastSessionId, index);
    }catch(e){
      console.log("There is a problem calling claim function on index ",index);
    }

    balanceAfter = await nftStaking.balances(lastSessionId, player, index);
    nftIdSlot[index] = parseInt(balanceAfter.nftId);
    assert.equal(balanceAfter.nftId , 0, "There should be no nft in slot " +index);
  });

  it("13. claiming for third slot should fail, since it was claimed earlier ", async () => {
    try{
      //if claim() doesnt fail, test should fail
      await nftStaking.claim(lastSessionId, index);
      assert.fail;
    }catch{
      //if claim() fails, the test should pass
      assert(true);
    }
  });

  it("14. claim all (claimAll) should fail, since all slots are empty ", async () => {
    try{
      //if claimAll() doesent fail, test should fail
      signature = await signBonus(bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]);
      await nftStaking.claimAll(lastSessionId, bonusPercent, signature[0], signature[1], signature[2], {from: player});
      nftIdSlot.fill(0);
      assert.fail;
    }catch{
      //if claimAll() fails, the test should pass
      assert(true);
    }
  });

  it("15. deposit one more nft and claim all ", async () => {
    nftId++;
    index=0;

    signature = await signNft(nftId,sp);

    //ERC721 approve and deposit token to contract
    await nft.approve(nftStaking.address, nftId);
      await nftStaking.deposit(lastSessionId, 0, nftId, sp, signature[0], signature[1], signature[2], {from: player});

    //check that the token has been deposited
    balanceBefore = await nftStaking.balances(lastSessionId, player, index);
    nftIdSlot[index] = parseInt(balanceBefore.nftId);
	  assert.equal(balanceBefore.nftId, nftId, "Deposited nftId should be " +nftId);

    //claimAll
    try{
      signature = await signBonus(bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]);
      await nftStaking.claimAll(lastSessionId, bonusPercent, signature[0], signature[1], signature[2], {from: player});
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

  it("16. claim all should fail, as it was claimed in previous step ", async () => {
    try{
      //if claimAll() dont fail, test should fail
      signature = await signBonus(bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]);
      await nftStaking.claimAll(lastSessionId, bonusPercent, signature[0], signature[1], signature[2], {from: player});
      nftIdSlot.fill(0);
      assert.fail;
    }catch{
      //if claimAll() fails, the test should pass
      assert(true);
    }
  });

  it("17. deposit two nft's and claim all  ", async () => {
    //deposit two nfts
    for(index=0; index<2; index++){
      if(nftIdSlot[index] == 0){
        nftId++;
        signature = await signNft(nftId,sp);
        await nft.approve(nftStaking.address, nftId);
          await nftStaking.deposit(lastSessionId, index, nftId, sp, signature[0], signature[1], signature[2], {from: player});
        balanceAfter = await nftStaking.balances(lastSessionId, player, index);
        nftIdSlot[index] = parseInt(balanceAfter.nftId);
      }
    }

    //claimAll
    try{
      signature = await signBonus(bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]);
      await nftStaking.claimAll(lastSessionId, bonusPercent, signature[0], signature[1], signature[2], {from: player});
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

  it("18. claim all should fail, as it was claimed in step ", async () => {
    try{
      //if claimAll() dont fail, test should fail
      signature = await signBonus(bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]);
      await nftStaking.claimAll(lastSessionId, bonusPercent, signature[0], signature[1], signature[2], {from: player});
      nftIdSlot.fill(0);
      assert.fail;
    }catch{
      //if claimAll() fails, the test should pass
      assert(true);
    }
  });

  it("19. deposit three nfts and claim all ", async () => {
    //deposit three nfts
    for(index=0; index<3; index++){
      if(nftIdSlot[index] == 0){
        nftId++;
        signature = await signNft(nftId,sp);
        await nft.approve(nftStaking.address, nftId);
          await nftStaking.deposit(lastSessionId, index, nftId, sp, signature[0], signature[1], signature[2], {from: player});
        balanceAfter = await nftStaking.balances(lastSessionId, player, index);
        nftIdSlot[index] = parseInt(balanceAfter.nftId);
      }
    }

    //claimAll
    try{
      signature = await signBonus(bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]);
      await nftStaking.claimAll(lastSessionId, bonusPercent, signature[0], signature[1], signature[2], {from: player});
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

  it("20. claim all should fail, as it was claimed in the last step ", async () => {
    try{
      //if claimAll() dont fail, test should fail
      signature = await signBonus(bonusPercent, nftIdSlot[0], nftIdSlot[1], nftIdSlot[2]);
      await nftStaking.claimAll(lastSessionId, bonusPercent, signature[0], signature[1], signature[2], {from: player});
      nftIdSlot.fill(0);
      assert.fail;
    }catch{
      //if claimAll() fails, the test should pass
      assert(true);
    }
  });

});
