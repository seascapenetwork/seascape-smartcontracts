let Staking = artifacts.require("Staking");

contract("Staking", async accounts => {
    // Samples
    let stakingToken = "0x5beabaebb3146685dd74176f68a0721f91297d37";
    let totalReward = web3.utils.toWei('100', 'ether');
    let period = 5; // blocks
    let startTime = Math.floor(Date.now()/1000);
    let generation = 0;

    it("should start a session that lasts "+period+" seconds", async () => {
	let staking = await Staking.deployed();

        await staking.startSession(stakingToken, totalReward, period, startTime, generation,
				      {from: accounts[0]})

	let sessionID = await staking.sessionFor.call(stakingToken);
	assert.equal(sessionID, 1, "First session ID is expected to be equal to 1");
    });

    it("should not overwrite a session before time expiration", async () => {
	let staking = await Staking.deployed();
	
	try {
	    await staking.startSession(stakingToken, totalReward, period, startTime, generation,
				       {from: accounts[0]});
	} catch(e) {
	    return assert.equal(e.reason, 'Seascape Staking: Session is started');
	}

	assert.fail();
    });

    it("should overwrite a session after time expiration", async() => {
	let staking = await Staking.deployed();

	let wait = (period + 1) * 1000; // milliseconds
	
        await new Promise(resolve => setTimeout(resolve, wait));

	await staking.startSession(stakingToken, totalReward, period, startTime, generation,
				   {from: accounts[0]});

	let sessionID = await staking.sessionFor.call(stakingToken);
	assert.equal(sessionID, 2, "Session after period expiration should return inserted ID of 2");
    });
});
