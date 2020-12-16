let NftRush = artifacts.require("NftRush");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");
let NftLeaderboard = artifacts.require("NftLeaderboard");

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

/* To show event log:
let res = await contract.method();
let eventName = res.logs[0].event;
let eventRes = res.logs[0].args;
console.log(eventRes);
*/
contract("Game 2: Nft Rush", async accounts => {
    // Samples
    let interval = 5;  // seconds
    let period = 180;   // 3 min
    let generation = 0;
    let depositAmount = web3.utils.toWei("5", "ether");

    let spentDailyReward = web3.utils.toWei("110", "ether");
    let spentAlltimeReward = web3.utils.toWei("110", "ether");
    let mintedDailyReward = web3.utils.toWei("110", "ether");
    let mintedAlltimsReward = web3.utils.toWei("110", "ether");
    let totalReward = parseInt(spentDailyReward) + parseInt(spentAlltimeReward) + parseInt(mintedDailyReward) + parseInt(mintedAlltimsReward);
    let rewardsAmounts = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2];

    // following vars used in multiple test units:
    let nft = null;
    let factory = null;
    let nftRush = null;
    let nftLeaderboard = null;
    let crowns = null;
    let lastSessionId = null;
    let player = null;
    let gameOwner = null;

    //--------------------------------------------------

    // before player starts, need a few things prepare.
    // one of things to allow nft to be minted by nft factory
    it("should link nft, nft factory, nft leaderboard and nft rush contracts", async () => {
	factory = await Factory.deployed();
	nftRush    = await NftRush.deployed();
	nft     = await Nft.deployed();
  nftLeaderboard    = await NftLeaderboard.deployed();
	gameOwner = accounts[0];

	await nft.setFactory(factory.address);
	await factory.addGenerator(nftRush.address, {from: gameOwner});
    });

    //--------------------------------------------------

    // before player plays the game,
    // game session should start by the game owner
    it("should start a session", async () => {
	player = accounts[0];

	let startTime = Math.floor(Date.now()/1000) + 1;

	await nftRush.startSession(interval, period, startTime, generation, {from: player});

	lastSessionId = await nftRush.lastSessionId();
	assert.equal(lastSessionId, 1, "session id is expected to be 1");
    });

    //--------------------------------------------------

    // before deposit of nft token,
    // player needs to approve the token to be transferred by nft rush contract
    it("should approve nft rush to spend cws of player", async () => {
	crowns = await Crowns.deployed();

	await crowns.approve(nftRush.address, depositAmount, {from: player});

	let allowance = await crowns.allowance(player, nftRush.address);
	assert.equal(allowance, depositAmount, "expected deposit sum to be allowed for nft rush");
    });

    //--------------------------------------------------

    // player deposits the cws
    it("should spend spend in nft rush", async () => {
	await nftRush.spend(lastSessionId, depositAmount, {from: player});

	let balance = await nftRush.balances(lastSessionId, player);
	assert.equal(balance.amount, depositAmount, "balance of player after deposit is not what expected");
    });

    //--------------------------------------------------

    // player should receive random nft
    it("should claim random nft", async () => {
	let quality = getRandomInt(5) + 1;

	let balance = await nftRush.balances(lastSessionId, player);

	let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
						     [web3.utils.toWei(web3.utils.fromWei(balance.amount)),
						      parseInt(balance.mintedTime.toString())]);
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

	await nftRush.mint(lastSessionId, v, r, s, quality);

	let updatedBalance = await nftRush.balances(lastSessionId, accounts[0]);
	assert.equal(updatedBalance.amount, 0, "deposit should be reset to 0");
    });

    it("double claiming should fail as the interval didn't passed", async () => {
	// approve deposit
	await crowns.approve(nftRush.address, depositAmount, {from: player});

	// deposit
	await nftRush.spend(lastSessionId, depositAmount, {from: player});

	// claim
	let quality = getRandomInt(5) + 1;

	let balance = await nftRush.balances(lastSessionId, gameOwner);

	let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
						     [web3.utils.toWei(web3.utils.fromWei(balance.amount)),
						      parseInt(balance.mintedTime.toString())]);
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


	try {
	    await nftRush.mint(lastSessionId, v, r, s, quality);
	} catch(e) {
	    return assert.equal(e.reason, "NFT Rush: not enough interval since last minted time");
	}
    });

    // ------------------------------------------------------------
    // Leaderboard related data
    // ------------------------------------------------------------

    it("set winner's reward amounts", async () => {
	// used for all leaderboard types
	rewardsAmounts = rewardsAmounts.map(function(amount) {return web3.utils.toWei(amount.toString())});

	await nftLeaderboard.setAllRewards(rewardsAmounts, rewardsAmounts, rewardsAmounts, rewardsAmounts);
    });

    it("set the winner list (daily spent)", async () => {
	let amount = 1;
	let player = accounts[1];
	let winners = [player, gameOwner, gameOwner, gameOwner, gameOwner, gameOwner, gameOwner, gameOwner, gameOwner, gameOwner];

	let approveAmount = 0;
	for(var i=0; i<amount; i++) {
	    approveAmount += rewardsAmounts[0];
	}

	await crowns.approve(nftRush.address, approveAmount, {from: gameOwner});

	await nftLeaderboard.addDailySpentWinners(lastSessionId, winners, amount);

	let claimables = await nftLeaderboard.spentDailyClaimables(player);
	assert.equal(claimables, 1, "expected 1 daily spent leaderboard reward");
    });

    it("claim daily spent leaderboard reward", async () => {
	let player = accounts[1];
	await nftLeaderboard.claimDailySpent({from: player});

	let claimables = await nftLeaderboard.spentDailyClaimables(player);
	assert.equal(claimables, 0, "expected no reward at all after claiming reward");
    });

});
