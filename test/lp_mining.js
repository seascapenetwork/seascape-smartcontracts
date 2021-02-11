let LpMining = artifacts.require("LpMining");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

contract("Game 1: Lp Mining", async accounts => {
    // Sample data to use for game
    let totalReward = web3.utils.toWei('100', 'ether');    // CWS amount to share
    let period = 7;                                        // seconds
    let startTime = null;                                  // defined in test unit, asynchrounues functions
                                                           // may invalidate the predefined time
    let generation = 0;
    let depositAmount = web3.utils.toWei('50', 'ether');

    // Game credentials used in multiple test units
    let sessionId = null;
    let lpMining = null;
    let lpToken = null;
    let crowns = null;
    let nft = null;
    let factory = null;

    //--------------------------------------------------
    
    // Before using the game contract, we should start the game session.
    // Before starting game session we should transfer CWS token to contract balance.
    // CWS in contract balance is required for game session award.
    it("should transfer the CWS into contract", async () => {
	crowns = await Crowns.deployed();
	lpMining = await LpMining.deployed();

	await crowns.transfer(lpMining.address, totalReward, {from: accounts[0]});

	let balance = await crowns.balanceOf.call(lpMining.address);
	assert.equal(balance, totalReward, "Lp Mining contract balance should match to total reward");
    });
    

    //--------------------------------------------------
    
    // Before using the game contract, we should start the game session.
    it("should start a session that lasts "+period+" seconds", async () => {
	lpToken = await LpToken.deployed();
	startTime = Math.floor(Date.now()/1000) + 2;
	
        await lpMining.startSession(lpToken.address, totalReward, period, startTime, generation,
				      {from: accounts[0]})

	sessionId = await lpMining.lastSessionIds.call(lpToken.address);
	
	assert.equal(sessionId, 1, "Started session id expected to be 1");
    });

    //---------------------------------------------------

    it("should not overwrite a session before time expiration", async () => {
	startTime = Math.floor(Date.now()/1000) + 2;
	
	try {
	    await lpMining.startSession(lpToken.address, totalReward, period, startTime, generation,
				       {from: accounts[0]});
	} catch(e) {
	    return assert.equal(e.reason, 'Seascape Staking: Can\'t start when session is already active');
	}

	assert.fail();
    });

    //------------------------------------------------------------
    
    it("should overwrite a session after time expiration", async() => {
	// wait until passes 2 second after session period
	let wait = (period + 2) * 1000; // milliseconds
        await new Promise(resolve => setTimeout(resolve, wait));

	
	await crowns.transfer(lpMining.address, totalReward, {from: accounts[0]});
	
	startTime = Math.floor(Date.now()/1000) + 2;	
	await lpMining.startSession(lpToken.address, totalReward, period, startTime, generation,
				   {from: accounts[0]});

	sessionId = await lpMining.lastSessionIds.call(lpToken.address);
	assert.equal(sessionId, 2, "Session after period expiration should return inserted ID of 2");
    });

    //---------------------------------------------------

    // Testing as a player. However,
    // before playing, player should have some LP token.
    // Sending from LP minter to player
    it("should transfer some fake LP CWS-ETH token to player", async () => {
	let from = accounts[0];
	let to = accounts[1];

	await lpToken.transfer(to, depositAmount, {from: from});

	let balance = await lpToken.balanceOf.call(to);
	assert.equal(balance, depositAmount, "Lp Token balance of player is not what expected");
    });

    //--------------------------------------------------

    // Depositing LP token to Smartcontract.
    // However, before deposit, it should be approved to Smartcontract
    it("should approve to deposit some token", async() => {
	let from = accounts[1];

	await lpToken.approve(lpMining.address, depositAmount, {from: from});

	let allowance = await lpToken.allowance.call(from, lpMining.address);
	assert.equal(allowance, depositAmount, "Deposit amount of Lp Tokens were not allowed to be transferred");
    });

    //--------------------------------------------------
    
    it("should deposit a staking token by a player", async() => {
	let from = accounts[1];

	await lpMining.deposit(sessionId, depositAmount, {from: from});

	let balance = await lpMining.stakedBalanceOf.call(sessionId, from);

	assert.equal(balance, depositAmount, "Player Balance in Lp Mining expected to be deposit amount");
    });

    //--------------------------------------------------

    // After deposit, wait for some time to produce staking result.
    it("should produce some Crowns for staked Lp token", async() => {
	let player = accounts[1];
	let cwsBalance = await lpMining.claimable.call(sessionId, player);
	
	let wait = 2 * 1000; // milliseconds	
        await new Promise(resolve => setTimeout(resolve, wait));

	let stakedBalance = await lpMining.claimable.call(sessionId, player);
	
	assert.equal(stakedBalance > cwsBalance, true, "Claimables after some time should be increased");
    });

    //--------------------------------------------------

    // Player should claim CWS
    it("should claim some Crowns", async() => {
	let player = accounts[1];
        let _lpMining = lpMining;

	try {
	    await _lpMining.claim(sessionId, {from: player});
	} catch(e) {
	    assert.fail('Nothing was generated to claim');
	    return;
	}
    });

    
    it("should withdraw all Lp Tokens", async() => {
	let player = accounts[1];
	await lpMining.withdraw(sessionId, depositAmount, {from: player});

	balance = await lpMining.stakedBalanceOf.call(sessionId, player);
	assert.equal(balance, 0, "Withdrawn Lp Token amount should be 0");
    });

    it("should fail to claim any token without LP token", async() => {
	let player = accounts[1];
	
	try {
	    await lpMining.claim(sessionId, {from: player});
	} catch(e) {
	    return assert.equal(e.reason, "Seascape Staking: No deposit was found");
	}

	assert.fail();
    });


    //--------------------------------------------------

    // Claiming Seascape Nft.
    // First, we need to link Smartcontracts between each other.
    it("should link nft, factory and lp mining contracts", async() => {
	nft = await Nft.deployed();
	factory = await Factory.deployed();

	await nft.setFactory(factory.address);
	await factory.addStaticUser(lpMining.address);
    });

    // Claiming Seascape Nft.
    // First, we need to link Smartcontracts between each other.
    it("should link nft, factory and lp mining contracts", async() => {
	nft = await Nft.deployed();
	factory = await Factory.deployed();

	await nft.setFactory(factory.address);
	await factory.addStaticUser(lpMining.address);
    });

    // Claiming Seascape Nft.
    it("should claim Nft", async() => {
	let player = accounts[1];
	

	await lpMining.claimNft(sessionId, {from: player});
    });

    it("should throw an exception if you claim Nft second time", async() => {
	    let player = accounts[1];
      try{
        await lpMining.claimNft(sessionId, {from: player});
        assert.fail();
      } catch(e) {
        return assert.equal(e.reason, "Seascape Staking: Already minted");
      }
    });
});
