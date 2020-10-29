let Staking = artifacts.require("Staking");
let LPToken = artifacts.require("LP_Token");
let Crowns = artifacts.require("CrownsToken");

contract("Staking", async accounts => {
    // Samples
    let totalReward = web3.utils.toWei('100', 'ether');
    let period = 5; // blocks
    let startTime = Math.floor(Date.now()/1000) + 2;
    let generation = 0;

    it("should transfer the CWS into contract", async () => {
	let crowns = await Crowns.deployed();
	let staking = await Staking.deployed();

	await crowns.transfer(staking.address, totalReward, {from: accounts[0]});

	let balance = await crowns.balanceOf.call(staking.address);
	assert.equal(balance, totalReward, "Balance of Staking Contract should match to total reward");
    });
    
    it("should start a session that lasts "+period+" seconds", async () => {
	let staking = await Staking.deployed();
	let stakingToken = await LPToken.deployed(); stakingToken = stakingToken.address;

        await staking.startSession(stakingToken, totalReward, period, startTime, generation,
				      {from: accounts[0]})

	let balance = await staking.stakedBalance.call(stakingToken);
	assert.equal(balance, 0, "Balance expected to be equal to 0");
    });

    it("should not overwrite a session before time expiration", async () => {
	let staking = await Staking.deployed();
	let stakingToken = await LPToken.deployed(); stakingToken = stakingToken.address;
	
	try {
	    await staking.startSession(stakingToken, totalReward, period, startTime, generation,
				       {from: accounts[0]});
	} catch(e) {
	    return assert.equal(e.reason, 'Seascape Staking: Session is started');
	}

	assert.fail();
    });

    /*it("should overwrite a session after time expiration", async() => {
	let staking = await Staking.deployed();

	let wait = (period + 1) * 1000; // milliseconds
	
        await new Promise(resolve => setTimeout(resolve, wait));

	await staking.startSession(stakingToken, totalReward, period, startTime, generation,
				   {from: accounts[0]});

	let sessionID = await staking.sessionFor.call(stakingToken);
	assert.equal(sessionID, 2, "Session after period expiration should return inserted ID of 2");
    });*/

    it("should deposit a staking token by a player", async() => {
	let staking = await Staking.deployed();
	let stakingToken = await LPToken.deployed(); stakingToken = stakingToken.address;
	
	let amount = web3.utils.toWei('50', 'ether');

	await staking.deposit(stakingToken, amount, {from: accounts[1]});

	let balance = await staking.stakedBalanceOf.call(stakingToken, accounts[1]);
	assert.equal(balance, amount, "Deposited sum of LP tokens should be 50");
    });

    it("should claim some Crowns", async() => {
	let staking = await Staking.deployed();
	let stakingToken = await LPToken.deployed(); stakingToken = stakingToken.address;
	
	let claimable = await staking.claimable.call(stakingToken, accounts[1]);
	console.log("1. Claimable amount is "+web3.utils.fromWei(claimable)+", "+claimable);
	
	let wait = 2 * 1000; // milliseconds
	
        await new Promise(resolve => setTimeout(resolve, wait));

	let claimable2 = await staking.claimable.call(stakingToken, accounts[1]);
	console.log("2. Claimable amount is "+web3.utils.fromWei(claimable2)+", "+claimable2);
	
	try {
	    await staking.claim(stakingToken, {from: accounts[1]});
	} catch(e) {
	    assert.fail('Seascape Staking: Nothing was generated to claim');
	    return;
	}

    });

    it("should withdraw all LP Tokens", async() => {
	let staking = await Staking.deployed();
	let stakingToken = await LPToken.deployed(); stakingToken = stakingToken.address;
	
	let amount = web3.utils.toWei('50', 'ether');
	
	await staking.withdraw(stakingToken, amount, {from: accounts[1]});

	let balance = await staking.stakedBalanceOf.call(stakingToken, accounts[1]);
	assert.equal(balance, 0, "Withdrawn LP Token amount should be 0");
    });

    it("should fail to claim any token without LP token", async() => {
	let staking = await Staking.deployed();
	let stakingToken = await LPToken.deployed(); stakingToken = stakingToken.address;
	
	try {
	    await staking.claim(stakingToken, {from: accounts[1]});
	} catch(e) {
	    return assert.equal(e.reason, "Seascape Staking: No LP Staking tokens to claim");
	}

	assert.fail();
    });
});
