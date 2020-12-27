var NftStaking = artifacts.require("./NftStaking.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");


function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}


contract("Game 3: Nft Staking", async accounts => {

  // let interval = 5;  // seconds
  let period = 604800;   // in a week    2. startSession
  let generation = 0; //2. startSeassion
  let totalReward = web3.utils.toWei("10", "ether");; //2. startSeassion
  let depositAmount = web3.utils.toWei("30", "ether");


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

  it("3.1 Should mint 5 nft tokens", async () => {
    //check nft user balance before
    let balanceBefore = await nft.balanceOf(player);
    console.log('Player balance before: ' ,balanceBefore.toString());

    //mint.js
    let grantPermission = async function(factory, address) {
        let res = await factory.addGenerator(address);
        //console.log(res);
        console.log(`Account ${address} granted a GENERATOR permission in Nft Factory`);
        return res;
    }.bind(this);

    let init = async function() {
        web3.eth.getAccounts(function(err,res) {accounts = res;});


        let granted = await factory.isGenerator(accounts[0]);
        if (!granted) {
    	await grantPermission(factory, accounts[0]);
        } else {
    	console.log(`Account ${accounts[0]} was already granted a permission`);
        }

        let owner = accounts[0];
        let generation = 0;
        let quality = 1;

        let quality1 = await factory.mintQuality(owner, generation, quality);

        let quality2 = await factory.mintQuality(owner, generation, quality + 1);

        let quality3 = await factory.mintQuality(owner, generation, quality + 2);

        let quality4 = await factory.mintQuality(owner, generation, quality + 3);

        let quality5 = await factory.mintQuality(owner, generation, quality + 4);
    };

    await init();

    //check nft user balance after
    let balanceAfter = await nft.balanceOf(player);
    console.log('Player balance after: ' ,balanceAfter.toString());
    assert.equal(parseInt(balanceAfter), parseInt(balanceBefore)+5, "5 Nft tokens should be minted");

  });


  it("4 should deposit first nft to game contract (deposit method)", async () => {
    // check nft contract balance before
    let index = 0;
    let balance = await nftStaking.balances(lastSessionId, player, index);
    console.log('Contract balance before: ' ,balance[0].toString());

    //digital signature
    let quality = getRandomInt(5) + 1;
    //v, r, s related stuff
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
                   [web3.utils.toWei(web3.utils.fromWei(balance[0].toString())),
                    parseInt(balance[0].toString())]);
    let bytes1 = web3.utils.bytesToHex([quality]);
    let str = player + bytes32.substr(2) + bytes1.substr(2);


    let data = web3.utils.keccak256(str);
    let hash = await web3.eth.sign(data, gameOwner);
    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
        v += 27;
      }

    await nftStaking.deposit(lastSessionId, nftId, sp, v, r, s, {from: player});

    // check nft contract balance after
    balanceAfter = await nftStaking.balances(lastSessionId, player, index);
    console.log('Contact balance after: ' ,balanceAfter[0].toString());
	  assert.notEqual(balance, balanceAfter, "Nft should be deposited to contract.");


  });

  // it("5.	should deposit second nft to game contract ", async () => {
  //easy
  //     });
  // it("6.	should deposit third nft to game contract ", async () => {
  //easy
  //     });
  // it("7.	depositing fourth nft should fail, as game has 3 slots only ", async () => {
  //
  //     });
  // it("8.	should claim for first slot (claim method) ", async () => {
  //
  //     });
  // it("9.	claiming for first slot should fail, since it was claimed earlier ", async () => {
  //     });
  // it("10.	should claim for second slot ", async () => {
  //     });
  // it("11.	claiming for second slot should fail, since it was claimed earlier ", async () => {
  //     });
  // it("12.	should claim for third slot ", async () => {
  //     });
  // it("13.	claiming for third slot should fail, since it was claimed earlier ", async () => {
  //     });
  // it("14.	claim all (claimAll) should fail, since all slots are empty ", async () => {
  //     });
  // it("15.	deposit one more nft and claim all ", async () => {
  //     });
  // it("16.	claim all should fail, as it was claimed in previous step ", async () => {
  //     });
  // it("17.	deposit two nft's and claim all  ", async () => {
  //     });
  // it("18.	claim all should fail, as it was claimed in step ", async () => {
  //     });
  // it("19.	deposit three nfts and claim all ", async () => {
  //     });
  // it("20.	claim all should fail, as it was claimed in the last step ", async () => {
  //     });




});
