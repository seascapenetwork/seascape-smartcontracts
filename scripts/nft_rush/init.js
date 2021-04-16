let NftRush = artifacts.require("NftRush");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let interval = 120;  // 0.5 minutes
let period = 3600 * 24 * 7;   // 1 day 
let generation = 0;
let dailyWinners = ["120", "50", "30", "15", "10", "5", "5", "5", "5", "5"];
let allTimeWinners = ["2000", "1000", "500", "300", "300", "300", "200", "200", "100", "100"];
let nftBrawlAddress = "0xE34E8F8eFa3D040f2625790C96295e0aB22B1EA2";
let nftFactoryAddress = "0x25F4C38FAF75dF9622FECB17Fa830278cd732091";    

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    let res = await init(networkId);
    
    callback(null, res);
};

let init = async function() {
    web3.eth.getAccounts(function(err,res) { accounts = res; });

    let nftRush = await NftRush.at(nftBrawlAddress);    

    await setAllRewards(nftRush);
    console.log("Nft Rush set the reward sizes");

    let factory = await Factory.at(nftFactoryAddress);
    let isGiven = await factory.isGenerator(nftBrawlAddress).catch(e => console.error);
    if (!isGiven) {
        await factory.addGenerator(nftRush.address);
        console.log("Nft Rush was granted a permission by factory to mint Seascape NFT!");
    }

    //should start a session
    let startTime = Math.floor(Date.now()/1000) + 180;
    await nftRush.startSession(interval,
				      period,
				      startTime,
				      generation,
				      {from: accounts[0], gasPrice: 136000000000});

    let sessionId = await nftRush.lastSessionId();
    console.log(sessionId +" session id started");
}.bind(this);


// ------------------------------------------------------------
// Leaderboard related data
// ------------------------------------------------------------
let setAllRewards = async function(nftRush) {

    for (var i = 0; i<10; i++) {
        allTimeWinners[i] = web3.utils.toWei(allTimeWinners[i]);
        dailyWinners[i] = web3.utils.toWei(dailyWinners[i]);
    }

    await nftRush.setPrizes(dailyWinners, allTimeWinners, {gasPrice: 136000000000});

    console.log("Set all reward prizes");
};
