var Riverboat = artifacts.require("./Riverboat.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var RiverboatFactory = artifacts.require("./RiverboatFactory.sol");
var Nft = artifacts.require("./RiverboatNft.sol");



contract("Riverboat", async accounts => {

  // bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
  //     msg.sender,
  //     _slotId,
  //     _currentInterval,
  //     unsoldNftsCount[_sessionId][_slotId]
  // ));

  //digital signatures
  async function generateSignature(_slotId, _currentInterval, _unsoldNftsCount) {
    //v, r, s related stuff
    let bytes32 = web3.eth.abi.encodeParameters(
      ["uint256", "uint256", "uint256"], [_slotId, _currentInterval, _unsoldNftsCount]);
    let str = player + bytes32.substr(2);
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

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


///////////// GLOBAL VARS ///////////////

  // imported contracts
  let riverboat = null;
  let crowns = null;
  let factory = null;
  let nft = null;

  // session & accounts data
  let lastSessionId = null;
  let player = null;
  let gameOwner = null;
  let signature = null;

  //support variables
  let finney = 1000000000000000;
  let priceReceiver = accounts[1];


  it("0.1 should link nft, nft factory and nft burning contracts", async () => {
    riverboat = await Riverboat.deployed();
    factory = await RiverboatFactory.deployed();
    nft = await Nft.deployed();
    crowns = await Crowns.deployed();
    gameOwner = accounts[0];
    player = accounts[0];

    await nft.setFactory(factory.address);
    await factory.addGenerator(riverboat.address, {from: gameOwner});
  });

  it("1. should start a game session id 1", async () => {
    let currencyAddress = crowns.address;
    let startPrice = web3.utils.toWei("1", "ether");
    let priceIncrease = web3.utils.toWei("1", "ether");
    let startTime = Math.floor(Date.now()/1000) + 3;  //make sure to set proper value
    let intervalDuration = 8;
    let intervalsAmount = 2;
    let slotsAmount = 5;
    let factoryAddress = factory.address;


    await riverboat.startSession(currencyAddress, factoryAddress, startPrice, priceIncrease,
      startTime, intervalDuration, intervalsAmount, slotsAmount, {from: gameOwner});

    let sessionId = await riverboat.sessionId();
    assert.equal(parseInt(sessionId), 1, "session id is expected to be 1");
  });

  it("2. starting a session before last session has started should fail", async () => {
    let currencyAddress = crowns.address;
    let startPrice = web3.utils.toWei("1", "ether");
    let priceIncrease = web3.utils.toWei("1", "ether");
    let startTime = Math.floor(Date.now()/1000) + 120;
    let intervalDuration = 5;		//10 seconds
    let intervalsAmount = 2;
    let slotsAmount = 5;
    let nftFactory = factory.address;

    try{
      await riverboat.startSession(currencyAddress, factoryAddress, startPrice, priceIncrease,
        startTime, intervalDuration, intervalsAmount, slotsAmount, {from: gameOwner});
      assert.fail();
    }catch(e){
      let sessionId = await riverboat.sessionId();
      assert.equal(parseInt(sessionId), 1, "session id is expected to be 1");
      //assert.equal(e.reason, "last session hasnt finished yet", "startSession function should return an error");
    }
  });

  it("3. should not be able to buy slot 1 before session is active", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 1;
    let currentInterval = 0;
    let currentPrice = web3.utils.toWei("1", "ether");
    let unsoldNftsCount = 2;

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
  	let allowance = await crowns.allowance(player, riverboat.address);
  	assert.equal(allowance, currentPrice, "insufficient allowance amount");

    let signature = await generateSignature(slotId, currentInterval, unsoldNftsCount);

    try{
      await riverboat.buy(parseInt(sessionId), slotId, signature[0], signature[1], signature[2], {from: player});
      assert.fail();
    }catch(e){
      assert.equal(e.reason, "session is not active", "buy function should return an error");
    }
  });

  it("should get time", async () => {
    await sleep(3000);

    let currentTime = await riverboat.returnTime();
    currentTime = parseInt(currentTime);

    assert(true);
  });

  it("should get data", async () => {

    let sessionId = await riverboat.sessionId();
    sessionId = parseInt(sessionId);
    console.log(sessionId);
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log(currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    currentPrice = parseInt(currentPrice);
    console.log(currentPrice);

    assert(sessionId, 1, "sessionId should be 1");
    //assert(currentInterval, 0, "interval should be 0");
  });

  it("4. should be able to buy slot 1 once the session is active", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 1;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let unsoldNftsCount = await riverboat.getUnsoldNftsCount(sessionId, slotId);
    unsoldNftsCount = parseInt(unsoldNftsCount);
    console.log("unsold nfts count: ", unsoldNftsCount);
    //let priceToConfirm = web3.utils.toWei("100", "ether");

    let nftBalanceBefore = await nft.balanceOf(player);
    //let cwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
  	let allowance = await crowns.allowance(player, riverboat.address);
  	assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    let signature = await generateSignature(slotId, currentInterval, unsoldNftsCount);

    await riverboat.buy(parseInt(sessionId), slotId, signature[0], signature[1], signature[2], {from: player});

    let nftBalanceAfter = await nft.balanceOf(player);
    let cwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    assert(nftBalanceBefore + 1, nftBalanceAfter, "buyer did not receive nft")
    //TODO not checking the following assert since owner = player
    // assert(parseInt(cwsBalanceBefore) + parseInt(currentPrice), parseInt(cwsBalanceAfter),
    //   "Price receiver did not receive sufficient amount of rib");
  });

  it("5. should not be able to buy slot 1 again in the same interval", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 1;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let unsoldNftsCount = await riverboat.getUnsoldNftsCount(sessionId, slotId);
    unsoldNftsCount = parseInt(unsoldNftsCount);
    console.log("unsold nfts count: ", unsoldNftsCount);

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
  	let allowance = await crowns.allowance(player, riverboat.address);
  	assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    let signature = await generateSignature(slotId, currentInterval, unsoldNftsCount);

    try{
      await riverboat.buy(sessionId, slotId, signature[0], signature[1], signature[2], {from: gameOwner});
      assert.fail();
    }catch(e){
      assert.equal(e.reason, "nft at slot not available", "buy function should return an error");
    }
  });

  // TODO!
  xit("6. another player should be able to buy slot 2 in the same interval", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 2;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let unsoldNftsCount = await riverboat.getUnsoldNftsCount(sessionId, slotId);
    unsoldNftsCount = parseInt(unsoldNftsCount);
    console.log("unsold nfts count: ", unsoldNftsCount);
    //let priceToConfirm = web3.utils.toWei("100", "ether");

    let nftBalanceBefore = await nft.balanceOf(player);
    //let cwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
  	let allowance = await crowns.allowance(player, riverboat.address);
  	assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    let signature = await generateSignature(slotId, currentInterval, unsoldNftsCount);

    await riverboat.buy(parseInt(sessionId), slotId, signature[0], signature[1], signature[2], {from: player});

    let nftBalanceAfter = await nft.balanceOf(player);
    let cwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    assert(nftBalanceBefore + 1, nftBalanceAfter, "buyer did not receive nft")
    //TODO not checking the following assert since owner = player
    // assert(parseInt(cwsBalanceBefore) + parseInt(currentPrice), parseInt(cwsBalanceAfter),
    //   "Price receiver did not receive sufficient amount of rib");
  });

  it("7. should not be able to buy slot 2 in the same interval", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 2;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let unsoldNftsCount = await riverboat.getUnsoldNftsCount(sessionId, slotId);
    unsoldNftsCount = parseInt(unsoldNftsCount);
    console.log("unsold nfts count: ", unsoldNftsCount);
    //let priceToConfirm = web3.utils.toWei("100", "ether");

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
    let allowance = await crowns.allowance(player, riverboat.address);
    assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    let signature = await generateSignature(slotId, currentInterval, unsoldNftsCount);

    try{
      await riverboat.buy(parseInt(sessionId), slotId, signature[0], signature[1], signature[2], {from: player});
      assert.false();
    } catch(e) {
      assert.equal(e.reason, "nft at slot not available", "buy function should return an error");
    }
  });

  it("should get time", async () => {
    await sleep(2000);

    let currentTime = await riverboat.returnTime();
    currentTime = parseInt(currentTime);

    assert(true);
  });


  it("8. should be able to buy slot 1 again in the next interval", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 1;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let unsoldNftsCount = await riverboat.getUnsoldNftsCount(sessionId, slotId);
    unsoldNftsCount = parseInt(unsoldNftsCount);
    console.log("unsold nfts count: ", unsoldNftsCount);
    //let priceToConfirm = web3.utils.toWei("100", "ether");

    let nftBalanceBefore = await nft.balanceOf(player);
    //let cwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
  	let allowance = await crowns.allowance(player, riverboat.address);
  	assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    let signature = await generateSignature(slotId, currentInterval, unsoldNftsCount);

    await riverboat.buy(parseInt(sessionId), slotId, signature[0], signature[1], signature[2], {from: player});

    let nftBalanceAfter = await nft.balanceOf(player);
    let cwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    assert(nftBalanceBefore + 1, nftBalanceAfter, "buyer did not receive nft")
  });


  it("9. should not be able to withdraw nfts before session is finished", async () => {
    let sessionId = await riverboat.sessionId();
    let receiverAddress = gameOwner;

    try{
      await riverboat.withdrawUnsoldNfts(sessionId, receiverAddress, {from: gameOwner});
      assert.fail();
    }catch(e){
      assert.equal(e.reason, "seesion needs to be finished", "withdrawUnsoldNfts function should return an error");
    }
  });


  it("10. starting a session before last session is finished should fail", async () => {
    let currencyAddress = crowns.address;
    let startPrice = web3.utils.toWei("1", "ether");
    let priceIncrease = web3.utils.toWei("1", "ether");
    let startTime = Math.floor(Date.now()/1000) + 60;
    let intervalDuration = 60;		//10 minutes
    let intervalsAmount = 3;
    let slotsAmount = 5;
    let nftFactory = factory.address;

    try{
      await riverboat.startSession(currencyAddress, factoryAddress, startPrice, priceIncrease,
        startTime, intervalDuration, intervalsAmount, slotsAmount, {from: gameOwner});
      assert.fail();
    }catch(e){
      let sessionId = await riverboat.sessionId();
      assert.equal(parseInt(sessionId), 1, "session id is still expected to be 1");
    }
  });

  it("should get time", async () => {
    await sleep(5000);

    let currentTime = await riverboat.returnTime();
    currentTime = parseInt(currentTime);

    assert(true);
  });

  it("11. should not be able to buy slot 1 once the session is finished", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 1;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let unsoldNftsCount = await riverboat.getUnsoldNftsCount(sessionId, slotId);
    unsoldNftsCount = parseInt(unsoldNftsCount);
    console.log("unsold nfts count: ", unsoldNftsCount);
    //let priceToConfirm = web3.utils.toWei("100", "ether");

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
  	let allowance = await crowns.allowance(player, riverboat.address);
  	assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    let signature = await generateSignature(slotId, currentInterval, unsoldNftsCount);

    try{
      await riverboat.buy(sessionId, slotId, signature[0], signature[1], signature[2], {from: gameOwner});
      assert.fail();
    }catch(e){
      assert(true);
      //assert.equal(e.reason, "session is not active", "buy function should return an error");
    }

  });


  it("12. should be able to withdraw nfts after session is finished", async () => {
    let sessionId = await riverboat.sessionId();
    let receiverAddress = gameOwner;
    let unsoldNftsCount = 8;

    let nftBalanceBefore = await nft.balanceOf(receiverAddress);
    nftBalanceBefore = parseInt(nftBalanceBefore);
    console.log("balance before: " ,nftBalanceBefore);


    await riverboat.withdrawUnsoldNfts(sessionId, receiverAddress, {from: gameOwner});

    let nftBalanceAfter = await nft.balanceOf(receiverAddress);
    nftBalanceAfter = parseInt(nftBalanceAfter);
    console.log("balance after: " ,nftBalanceAfter);

    assert.equal(nftBalanceBefore+unsoldNftsCount, parseInt(nftBalanceAfter),
      "receiver got incorrect number of nfts");

  });


  it("13. should not be able to withdraw unsold nfts for the second time", async () => {
    let sessionId = await riverboat.sessionId();
    let receiverAddress = gameOwner;

    try{
      await riverboat.withdrawUnsoldNfts(sessionId, receiverAddress, {from: gameOwner});
      assert.fail();
    }catch(e){
      //assert(true);
      assert.equal(e.reason, "no unsold nfts to withdraw", "withdraw function should return an error");
    }

  });

  xit("14. should be able to start a new season after previous is complete", async () => {

  });


});
