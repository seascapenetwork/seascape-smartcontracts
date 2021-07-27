var NftBurning = artifacts.require("./NftBurning.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");



contract("Game 4: Nft Burning", async accounts => {


  //digital signatures
  async function signNfts(nftIds, quality) {
    //v, r, s related stuff
    let bytes32 = web3.eth.abi.encodeParameters(
      ["uint256", "uint256", "uint256", "uint256", "uint256"], nftIds);
    let bytes1 = web3.utils.bytesToHex([quality]);
    let str = bytes32 + bytes1.substr(2);
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


///////////// GLOBAL VARS ///////////////

  // imported contracts
  let nftBurning = null;
  let crowns = null;
  let factory = null;
  let nft = null;

  // session & accounts data
  let lastSessionId = null;
  let player = null;
  let gameOwner = null;
  let signature = null;

  // required to start session
  let period = 604800;  // 7 days
  let generation = 1;   // newly minted nfts will be gen 1
  let interval = 5;  // 5 seconds
  let fee = web3.utils.toWei("1", "ether");

  // nfts data, required for mint
  let quality = 3;
  let nftIds = new Array(5);

  //support variables
  let finney = 1000000000000000;



  it("1. should link nft, nft factory and nft burning contracts", async () => {
    nftBurning = await NftBurning.deployed();
    factory = await Factory.deployed();
    nft = await Nft.deployed();
    crowns = await Crowns.deployed();
    gameOwner = accounts[0];
    player = accounts[1];

    await nft.setFactory(factory.address);
    await factory.addGenerator(nftBurning.address, {from: gameOwner});
  });

  it("2. should start a game session (event) for 1 week", async () => {
    let startTime = Math.floor(Date.now()/1000) + 3;

    await nftBurning.startSession(
        startTime, period, generation, interval, fee, {from: gameOwner});

    lastSessionId = await nftBurning.lastSessionId();
    assert.equal(lastSessionId, 1, "session id is expected to be 1");
  });

  it("3. starting a session while there is another session should fail", async () => {
    let startTime = Math.floor(Date.now()/1000) + 3;

    try{
      await nftBurning.startSession(
          startTime, period, generation, interval, fee, {from: gameOwner});
    }catch(e){
      assert.equal(e.reason, "Another session already active", "startSession() should return an error.");
    }
  });

  it("4. should mint 5 nft tokens and fetch their ids", async () => {
    //check nft user balance before
    let balanceBefore = await nft.balanceOf(player);

    let granted = await factory.isGenerator(accounts[0]);
    await factory.addGenerator(accounts[0]);

    let generation = 0;
    let quality = 1;
    //mint 2 tokens of each quality
    while(quality < 6){
      await factory.mintQuality(player, generation, quality);
      quality++;
    }
    quality = 1;

    //check nft user balance after
    let balanceAfter = await nft.balanceOf(player);
    assert.equal(parseInt(balanceAfter), parseInt(balanceBefore)+5, "5 Nft tokens should be minted");

    //fetch nft ids
    for(let index = 0; index <5; index++){
      let tokenId = await nft.tokenOfOwnerByIndex(player, index);
      nftIds[index] = parseInt(tokenId.toString());
    }
    assert.equal(nftIds[4], 5, "couldnt fetch nft ids");
  });


  it("6. should mint crowns and approve spending of crowns and nfts", async () => {
    // scapes approve
    //await nft.approve(nftBurning.address, nftId, {from: player});
    await nft.setApprovalForAll(nftBurning.address, true, {from: player});

    //get some Crowns
    await crowns.transfer(player, fee, {from: gameOwner});

    // crowns approve
    await crowns.approve(nftBurning.address, fee, {from: player});
    let allowance = await crowns.allowance(player, nftBurning.address);
    assert.equal(allowance, fee, "expected nft burning to allow spending of crowns");
    });

  it("7. should burn the nfts and mint a higher quality one", async () => {
    //check player balance before
    let nftBalanceBefore = await nft.balanceOf(player);
    let cwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(player))/finney);

    quality = 3;
    signature = await signNfts(nftIds, quality);

    // mint function
    let minted = await nftBurning.mint(lastSessionId, nftIds, quality,
        signature[0], signature[1], signature[2], {from: player})
      .catch(console.error);

    // check player balance after
    let nftBalanceAfter = await nft.balanceOf(player);
    assert.equal(parseInt(nftBalanceBefore), parseInt(nftBalanceAfter)+4, "Player has too many nfts");

    let cwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(player))/finney);
    assert.equal(cwsBalanceBefore, cwsBalanceAfter+fee/finney, "Player didnt pay enough crowns");

    let newNftId = await nft.tokenOfOwnerByIndex(player, 0);
    assert.equal(parseInt(newNftId), 6, "Newly minted nftId should be 6");
  });


});
