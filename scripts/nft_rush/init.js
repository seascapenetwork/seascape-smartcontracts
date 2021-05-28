let NftRush = artifacts.require("NftRush");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let interval = 10;  // 0.5 minutes
let period = 3600 * 24;   // 1 day
let generation = 1;
let dailyWinners = ["12", "5", "3", "15", "10", "5", "5", "5", "5", "5"];
let allTimeWinners = ["20", "10", "5", "3", "3", "3", "2", "2", "1", "1"];
let nftBrawlAddress = "0xE34E8F8eFa3D040f2625790C96295e0aB22B1EA2";
let nftFactoryAddress = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    console.log("starting");
    let res = await init();

    callback(null, res);
};

let init = async function() {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);
    let nftRush = await NftRush.at(nftBrawlAddress);
    let announcement = await nftRush.announcement(1);
    console.log(announcement.dailySpentTime.toString());
    return;

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

    await nftRush.setPrizes(dailyWinners, allTimeWinners, {gasPrice: 136000000000}).catch(console.error);

    console.log("Set all reward prizes");
};
