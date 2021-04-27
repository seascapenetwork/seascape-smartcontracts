let NftRush = artifacts.require("NftRush");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let interval = 120;  // 0.5 minutes
let period = 3600 * 24;   // 1 day 
let generation = 0;
let dailyWinners = ["120", "50", "30", "15", "10", "5", "5", "5", "5", "5"];
let allTimeWinners = ["2000", "1000", "500", "300", "300", "300", "200", "200", "100", "100"];
let nftBrawlAddress = "0xE34E8F8eFa3D040f2625790C96295e0aB22B1EA2";
let nftFactoryAddress = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";    

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    console.log("Calling the init function...")
    let res = await init();
    
    callback(null, res);
};

let init = async function() {
    console.log("account is setting>..")
    accounts = await web3.eth.getAccounts();

    let nftRush = await NftRush.at(nftBrawlAddress);    
    console.log("Nft brawl contract instance created");

    let sessionId = await nftRush.lastSessionId();
    console.log(sessionId +" session id started");

    
    //await setAllRewards(nftRush);
    //console.log("Nft Rush set the reward sizes");

    let factory = await Factory.at(nftFactoryAddress);
    console.log("Nft Factory contract instance was created");

    let isGiven = await factory.isGenerator(nftBrawlAddress).catch(e => console.error);
    if (!isGiven) {
        await factory.addGenerator(nftRush.address);
        console.log("Nft Rush was granted a permission by factory to mint Seascape NFT!");
    }
    console.log("Generator was set");

    //should start a session
    let startTime = Math.floor(Date.now()/1000) + 180;
    await nftRush.startSession(interval,
				      period,
				      startTime,
				      generation,
				      {from: accounts[0], gasPrice: 136000000000});

    sessionId = await nftRush.lastSessionId();
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
