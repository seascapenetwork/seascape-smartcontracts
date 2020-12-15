let NftRush = artifacts.require("NftRush");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let interval = 10;  // seconds
let period = 3600 * 60 * 5;   // 1 week 
let generation = 0;
let rewardPrize = 10; // first winner gets 10 CWS
let winnersAmount = 10; // ten winners are tracked

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = init(networkId);
        console.log("Session started successfully");
    
    callback(null, res);
};

let init = async function(networkId) {
    web3.eth.getAccounts(function(err,res) { accounts = res; });

    let nftRush = await NftRush.deployed();
    let factory = await Factory.deployed();
    let nft     = await Nft.deployed();

    let crowns  = await Crowns.deployed();
	
    /*if (networkId == 4) {
	crowns = await Crowns.at(process.env.CROWNS_RINKEBY);
    } else {
	crowns = await Crowns.deployed();
	}*/

    console.log("Total prize to pay: "+calculateTotalPrize());

    await setAllRewards(nftRush);
        
    //should add nft rush as generator role in nft factory
    await factory.addGenerator(nftRush.address, {from: accounts[0]});
    console.log("nft rush was granted permission to mint nft");

    //should set nft factory in nft
    await nft.setFactory(factory.address);

    
    //should start a session
    let startTime = Math.floor(Date.now()/1000) + 1;
    return await nftRush.startSession(interval,
				      period,
				      startTime,
				      generation,
				      {from: accounts[0]});
    console.log("Started a nft rush session");
}.bind(this);


// ------------------------------------------------------------
// Leaderboard related data
// ------------------------------------------------------------
let setAllRewards = async function(nftRush) {
    let winners = [];
    for(var i=1; i<=winnersAmount; i++) {
	let amount = Math.round(rewardPrize / i);
	let wei = web3.utils.toWei(amount.toString());
	winners.push(wei);
    }

    await nftRush.setAllRewards(winners, winners, winners, winners);

    console.log("Set all reward prizes");
};

let calculateTotalPrize = function() {
    let total = 0;
    for(var i=1; i<=winnersAmount; i++) {
	let amount = Math.round(rewardPrize / i);
	total += amount;
	console.log(total+" for "+i+" users");
    }

    return total;
};

let addDailyWinners = async function(nftRush, lastSessionId) {
    // in nftrush.sol contract, at the method claimDailyNft
    // comment requirement of isDailWinnersAddress against false checking

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
};

let claimDailyNft = async function(nftRush, lastSessionId) {
    let nftAmount = await nftRush.dailyClaimablesAmount(accounts[0]);
    nftAmount = parseInt(nftAmount.toString());

    if (!nftAmount) {
	return true;
    }

    for(var i=0; i<nftAmount; i++) {
	await nftRush.claimDailyNft();

	let updatedAmount = await nftRush.dailyClaimablesAmount(accounts[0]);
	updatedAmount = parseInt(updatedAmount.toString());

	//daily claimable amount didn't updated after nft claiming
	if (updatedAmount != nftAmount - (i+1)) {
	    return false;
	}
    }

    let zeroAmount = await nftRush.dailyClaimablesAmount(accounts[0]);
    zeroAmount = parseInt(zeroAmount.toString());

    // daily claimables after all claims should be equal to 0
    if (zeroAmount != 0) {
	return false;
    }

    await nftRush.claimDailyNft();
};
