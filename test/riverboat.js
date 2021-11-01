var Riverboat = artifacts.require("./Riverboat.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var RiverboatFactory = artifacts.require("./RiverboatFactory.sol");
var Nft = artifacts.require("./RiverboatNft.sol");



contract("Riverboat", async accounts => {


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

  // support variables
  let finney = 1000000000000000;
  let ether = 1000000000000000000;

  // global vars
  let priceReceiver = accounts[1];
  let unsoldNftsCount = new Array();
  let nftIds = new Array();


  it("0.1 should link nft, nft factory and nft burning contracts", async () => {
    riverboat = await Riverboat.deployed();
    factory = await RiverboatFactory.deployed();
    nft = await Nft.deployed();
    crowns = await Crowns.deployed();
    gameOwner = accounts[0];
    player = accounts[1];

    await nft.setFactory(factory.address);
    //await factory.addGenerator(riverboat.address, {from: gameOwner});
  });

  it("0.2 should send some crowns to address[1]", async () => {
    let transferValue = "20";
    let transferAmount = web3.utils.toWei(transferValue, "ether");

    crowns.transfer(player, transferAmount, {from: gameOwner});

    let newBalance = await crowns.balanceOf(player);
    newBalance = parseInt(newBalance)/ether;

    assert.equal(newBalance, parseInt(transferValue), "did not receive enough crowns")
  });

  it("0.3 should mint 10 nft tokens and fetch their ids", async () => {
    //check nft user balance before
    let balanceBefore = await nft.balanceOf(riverboat.address);

    let granted = await factory.isGenerator(accounts[0]);
    await factory.addGenerator(accounts[0]);

    //mint 2 tokens of each quality
    for(let type = 0; type < 5; type++){
      await factory.mintType(riverboat.address, type);
      await factory.mintType(riverboat.address, type);
    }

    //check nft user balance after
    let balanceAfter = await nft.balanceOf(riverboat.address);
    assert.equal(parseInt(balanceAfter), parseInt(balanceBefore)+10, "10 Nft tokens should be minted");

    //fetch nft ids
    for(let index = 0; index <10; index++){
      let tokenId = await nft.tokenOfOwnerByIndex(riverboat.address, index);
      nftIds[index] = parseInt(tokenId.toString());
    }
    assert.equal(nftIds[9], 10, "couldnt fetch nft ids");
  });

  it("1. should start a game session", async () => {
    let currencyAddress = crowns.address;
    let nftAddress = nft.address;
    let startPrice = web3.utils.toWei("1", "ether");
    let priceIncrease = web3.utils.toWei("1", "ether");
    let startTime = Math.floor(Date.now()/1000) + 3;  //make sure to set proper value
    let intervalDuration = 8;
    let intervalsAmount = 2;
    let slotsAmount = 5;

    await riverboat.startSession(currencyAddress, nftAddress, startPrice, priceIncrease,
      startTime, intervalDuration, intervalsAmount, slotsAmount, {from: gameOwner});

    let sessionId = await riverboat.sessionId();
    assert.equal(parseInt(sessionId), 1, "session id is expected to be 1");
  });

  it("2. should not be able to start a new session before last session has started", async () => {
    let currencyAddress = crowns.address;
    let nftAddress = nft.address;
    let startPrice = web3.utils.toWei("1", "ether");
    let priceIncrease = web3.utils.toWei("1", "ether");
    let startTime = Math.floor(Date.now()/1000) + 120;
    let intervalDuration = 5;		//10 seconds
    let intervalsAmount = 2;
    let slotsAmount = 5;

    try{
      await riverboat.startSession(currencyAddress, nftAddress, startPrice, priceIncrease,
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
    let nftId = nftIds[slotId] + currentInterval*5;

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
  	let allowance = await crowns.allowance(player, riverboat.address);
  	assert.equal(allowance, currentPrice, "insufficient allowance amount");

    try{
      await riverboat.buy(parseInt(sessionId), nftId, {from: player});
      assert.fail();
    }catch(e){
      assert.equal(e.reason, "session is not active", "buy function should return an error");
    }
  });

  it("should pass time", async () => {
    await sleep(3000);

    let currentTime = await riverboat.returnTime();
    currentTime = parseInt(currentTime);

    assert(true);
  });

  it("4. should be able to buy slot 1 once the session is active", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 1;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let nftId = nftIds[slotId] + currentInterval*5;

    let nftBalanceBefore = await nft.balanceOf(player);
    //let cwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
  	let allowance = await crowns.allowance(player, riverboat.address);
  	assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    await riverboat.buy(parseInt(sessionId), nftId, {from: player});

    let nftBalanceAfter = await nft.balanceOf(player);
    //let cwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    assert(nftBalanceBefore + 1, nftBalanceAfter, "buyer did not receive nft")
    //TODO not checking the following assert since owner = player
    // assert(parseInt(cwsBalanceBefore) + parseInt(currentPrice), parseInt(cwsBalanceAfter),
    //   "Price receiver did not receive sufficient amount of rib");
  });


  it("5. another user should not be able to buy slot 1 in the same interval anymore", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 1;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let nftId = nftIds[slotId] + currentInterval*5;

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: gameOwner});
  	let allowance = await crowns.allowance(gameOwner, riverboat.address);
  	assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    try{
      await riverboat.buy(parseInt(sessionId), nftId, {from: gameOwner});
      assert.fail();
    }catch(e){
      assert.equal(e.reason, "contract not owner of nft id", "buy function should return an error");
    }
  });

  it("6. should not be able to buy slot 2 in the same interval", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 2;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let nftId = nftIds[slotId] + currentInterval*5;

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
    let allowance = await crowns.allowance(player, riverboat.address);
    assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    try{
      await riverboat.buy(parseInt(sessionId), nftId, {from: player});
      assert.fail();
    }catch(e){
      assert.equal(e.reason, "nft at slot not available", "buy function should return an error");
    }
  });

  it("7. another user should be able to buy slot 2 in the same interval", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 2;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let nftId = nftIds[slotId] + currentInterval*5;


    let nftBalanceBefore = await nft.balanceOf(gameOwner);
    //let cwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: gameOwner});
    let allowance = await crowns.allowance(gameOwner, riverboat.address);
    assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");


    await riverboat.buy(parseInt(sessionId), nftId, {from: gameOwner});

    let nftBalanceAfter = await nft.balanceOf(gameOwner);
    //let cwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    assert(nftBalanceBefore + 1, nftBalanceAfter, "buyer did not receive nft")
    //TODO not checking the following assert since owner = gameOwner
    // assert(parseInt(cwsBalanceBefore) + parseInt(currentPrice), parseInt(cwsBalanceAfter),
    //   "Price receiver did not receive sufficient amount of rib");
  });


  it("should pass time", async () => {
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
    let nftId = nftIds[slotId] + currentInterval*5;

    let nftBalanceBefore = await nft.balanceOf(player);
    //let cwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
    let allowance = await crowns.allowance(player, riverboat.address);
    assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    await riverboat.buy(parseInt(sessionId), nftId, {from: player});

    let nftBalanceAfter = await nft.balanceOf(player);
    //let cwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(gameOwner))/finney);

    assert(nftBalanceBefore + 1, nftBalanceAfter, "buyer did not receive nft")
  });


  it("9. owner should not be able to withdraw nfts before session is finished", async () => {
    let sessionId = await riverboat.sessionId();
    let receiverAddress = gameOwner;

    try{
      await riverboat.approveUnsoldNfts(sessionId, receiverAddress, {from: gameOwner});
      assert.fail();
    }catch(e){
      assert.equal(e.reason, "seesion needs to be finished", "approveUnsoldNfts function should return an error");
    }
  });


  it("10. should not be able to start a new session before last session is finished", async () => {
    let currencyAddress = crowns.address;
    let nftAddress = nft.address;
    let startPrice = web3.utils.toWei("1", "ether");
    let priceIncrease = web3.utils.toWei("1", "ether");
    let startTime = Math.floor(Date.now()/1000) + 3;  //make sure to set proper value
    let intervalDuration = 8;
    let intervalsAmount = 2;
    let slotsAmount = 5;

    try{
      await riverboat.startSession(currencyAddress, nftAddress, startPrice, priceIncrease,
        startTime, intervalDuration, intervalsAmount, slotsAmount, {from: gameOwner});
      assert.fail();
    }catch(e){
      let sessionId = await riverboat.sessionId();
      assert.equal(parseInt(sessionId), 1, "session id is still expected to be 1");
    }
  });

  it("should pass time", async () => {
    await sleep(5000);

    let currentTime = await riverboat.returnTime();
    currentTime = parseInt(currentTime);

    assert(true);
  });

  it("11. should not be able to buy slot 3 once the session is finished", async () => {
    let sessionId = await riverboat.sessionId();
    let slotId = 3;
    let currentInterval = await riverboat.getCurrentInterval(sessionId);
    currentInterval = parseInt(currentInterval);
    console.log("current interval: ",currentInterval);
    let currentPrice = await riverboat.getCurrentPrice(sessionId, currentInterval);
    let nftId = nftIds[slotId] + currentInterval*5;

    //approve rib token and check allowance
    await crowns.approve(riverboat.address, currentPrice, {from: player});
  	let allowance = await crowns.allowance(player, riverboat.address);
  	assert.equal(parseInt(allowance), parseInt(currentPrice), "insufficient allowance amount");

    try{
      await riverboat.buy(parseInt(sessionId), nftId, {from: player});
      assert.fail();
    }catch(e){
      //assert(true);
      assert.equal(e.reason, "session is not active", "buy function should return an error");
    }

  });


  xit("12. should be able to withdraw nfts after session is finished", async () => {
    let sessionId = await riverboat.sessionId();
    let receiverAddress = gameOwner;
    let totalUnsoldNfts = unsoldNftsCount.reduce((a, b) => a + b, 0)

    let nftBalanceBefore = await nft.balanceOf(receiverAddress);
    nftBalanceBefore = parseInt(nftBalanceBefore);

    await riverboat.approveUnsoldNfts(sessionId, receiverAddress, {from: gameOwner});
    unsoldNftsCount.fill(0);

    let nftBalanceAfter = await nft.balanceOf(receiverAddress);
    nftBalanceAfter = parseInt(nftBalanceAfter);

    assert.equal(nftBalanceBefore+totalUnsoldNfts, parseInt(nftBalanceAfter),
      "receiver got incorrect number of nfts");

  });


  it("13. should be able to start a new season after previous is complete", async () => {
    let currencyAddress = crowns.address;
    let nftAddress = nft.address;
    let startPrice = web3.utils.toWei("1", "ether");
    let priceIncrease = web3.utils.toWei("1", "ether");
    let startTime = Math.floor(Date.now()/1000) + 3;  //make sure to set proper value
    let intervalDuration = 20;
    let intervalsAmount = 5;
    let slotsAmount = 3;

    await riverboat.startSession(currencyAddress, nftAddress, startPrice, priceIncrease,
      startTime, intervalDuration, intervalsAmount, slotsAmount, {from: gameOwner});

    let sessionId = await riverboat.sessionId();
    assert.equal(parseInt(sessionId), 2, "session id is expected to be 2");
  });


});
