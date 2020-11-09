let NftRush = artifacts.require("NftRush");
let LpToken = artifacts.require("LP_Token");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNFT");
let Factory = artifacts.require("NFTFactory");

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

/* To show event log:
let res = await contract.method();
let eventName = res.logs[0].event;
let eventRes = res.logs[0].args;
console.log(eventRes);
*/
contract("NftRush", async accounts => {
    // Samples
    let interval = 10;  // seconds
    let period = 180;   // 3 min
    let generation = 0;
    let depositAmount = web3.utils.toWei("5", "ether");

    it("should add nft rush as generator role in nft factory", async () => {
	let factory = await Factory.deployed();
	let nftRush = await NftRush.deployed();

	await factory.addGenerator(nftRush.address, {from: accounts[0]});

	let generatorRoled = await factory.isGenerator(nftRush.address);
    });

    it("should set nft factory in nft", async () => {
	let factory = await Factory.deployed();
	let nft     = await Nft.deployed();

	await nft.setFactory(factory.address);
    });

    it("should start a session", async () => {
	let nftRush    = await NftRush.deployed();
	
	let startTime = Math.floor(Date.now()/1000) + 1;

	await nftRush.startSession(interval, period, startTime, generation, {from: accounts[0]});

	let lastSessionId = await nftRush.lastSessionId();
	assert.equal(lastSessionId, 1, "session id is expected to be 1");
    });

    /////// depositing token
    it("should approve nft rush to spend cws of player", async () => {
	let crowns = await Crowns.deployed();
	let nftRush = await NftRush.deployed();

	await crowns.approve(nftRush.address, depositAmount, {from: accounts[0]});

	let allowance = await crowns.allowance(accounts[0], nftRush.address);
	assert.equal(allowance, depositAmount, "expected deposit sum to be allowed for nft rush");
    });

    it("should spend deposit in nft rush", async () => {
	let nftRush = await NftRush.deployed();
	let lastSessionId = await nftRush.lastSessionId();
	
	await nftRush.deposit(lastSessionId, depositAmount, {from: accounts[0]});

	let balance = await nftRush.balances(lastSessionId, accounts[0]);
	assert.equal(balance.amount, depositAmount, "balance of player after deposit is not what expected");
    });

    it("should claim random nft", async () => {
	let nftRush = await NftRush.deployed();
	let quality = getRandomInt(5) + 1;

	let lastSessionId = await nftRush.lastSessionId();
	let balance = await nftRush.balances(lastSessionId, accounts[0]);

	let addr = accounts[0];

	
	let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
						     [web3.utils.toWei(web3.utils.fromWei(balance.amount)),
						      parseInt(balance.mintedTime.toString())]);
	let bytes1 = web3.utils.bytesToHex([quality]);
	let str = addr + bytes32.substr(2) + bytes1.substr(2);
	
	let data = web3.utils.keccak256(str);
	let hash = await web3.eth.sign(data, addr);
	let r = hash.substr(0,66);
	let s = "0x" + hash.substr(66,64);
	let v = parseInt(hash.substr(130), 16);
	if (v < 27) {
	    v += 27;
	}

	await nftRush.claim(lastSessionId, v, r, s, quality);

	let updatedBalance = await nftRush.balances(lastSessionId, accounts[0]);
	assert.equal(updatedBalance.amount, 0, "deposit should be reset to 0");
    });

    it("double claiming should fail as the interval didn't passed", async () => {
	// approve deposit
	let crowns = await Crowns.deployed();
	let nftRush = await NftRush.deployed();

	await crowns.approve(nftRush.address, depositAmount, {from: accounts[0]});

	// deposit
	let lastSessionId = await nftRush.lastSessionId();
	
	await nftRush.deposit(lastSessionId, depositAmount, {from: accounts[0]});

	// claim
	
	let quality = getRandomInt(5) + 1;

	let balance = await nftRush.balances(lastSessionId, accounts[0]);

	let addr = accounts[0];
	
	let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
						     [web3.utils.toWei(web3.utils.fromWei(balance.amount)),
						      parseInt(balance.mintedTime.toString())]);
	let bytes1 = web3.utils.bytesToHex([quality]);
	let str = addr + bytes32.substr(2) + bytes1.substr(2);
	
	let data = web3.utils.keccak256(str);
	let hash = await web3.eth.sign(data, addr);
	let r = hash.substr(0,66);
	let s = "0x" + hash.substr(66,64);
	let v = parseInt(hash.substr(130), 16);
	if (v < 27) {
	    v += 27;
	}

	
	try {
	    await nftRush.claim(lastSessionId, v, r, s, quality);
	} catch(e) {
	    return assert.equal(e.reason, "NFT Rush: not enough interval since last minted time");
	}
    });

    // ------------------------------------------------------------
    // Leaderboard related data
    // ------------------------------------------------------------

    // in nftrush.sol contract, at the method claimDailyNft
    // comment requirement of isDailWinnersAddress against false checking
    it("add daily leaderboard winners as an owner", async () => {
	let nftRush = await NftRush.deployed();

	let lastSessionId = await nftRush.lastSessionId();

	let winners = [];
	for(var i=0; i<10; i++) {
	    if (i%2 == 0) {
		winners.push(accounts[0]);
	    } else {
		winners.push(accounts[1]);
	    }
	}

	// contract deployer. only it can add winners list into the contract
	let owner = accounts[0];

	try {
	    await nftRush.addDailyWinners(lastSessionId, winners);
	} catch(e) {
	    if (e.reason == "NFT Rush: already set or too early") {
		return true;
	    }
	}
    });

    // in nftrush.sol contract, at the method claimDailyNft
    // comment requirement of isDailWinnersAddress against false checking
    it("claim nft for daily items", async() => {
	let nftRush = await NftRush.deployed();
	let lastSessionId = await nftRush.lastSessionId();
	let nftAmount = await nftRush.dailyClaimablesAmount(accounts[0]);
	nftAmount = parseInt(nftAmount.toString());

	if (!nftAmount) {
	    return true;
	}

	for(var i=0; i<nftAmount; i++) {
	    await nftRush.claimDailyNft();

	    let updatedAmount = await nftRush.dailyClaimablesAmount(accounts[0]);
	    updatedAmount = parseInt(updatedAmount.toString());
	    if (updatedAmount != nftAmount - (i+1)) {
		fail("daily claimable amount didn't updated after nft claiming");
	    }
	}

	let zeroAmount = await nftRush.dailyClaimablesAmount(accounts[0]);
	zeroAmount = parseInt(zeroAmount.toString());

	if (zeroAmount != 0) {
	    fail("daily claimables after all claims should be equal to 0");
	}

	
	try {
	    await nftRush.claimDailyNft();
	} catch(e) {
	    return assert.equal(e.reason, "NFT Rush: no daily leaderboard claimable found");
	}
    });
});
