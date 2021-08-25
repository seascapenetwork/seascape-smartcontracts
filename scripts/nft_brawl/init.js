let NftBrawl = artifacts.require("NftRush");
let NftBrawlManager = artifacts.require("NftBrawlManager");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let interval = 120;  // 0.5 minutes
let period = 3600 * 24 * 7;   // 1 day
let generation = 0;
let dailyWinners = ["120", "50", "30", "15", "10", "5", "5", "5", "5", "5"];
let allTimeWinners = ["2000", "1000", "500", "300", "300", "300", "200", "200", "100", "100"];
let nftBrawlAddress = "0x20c1384C280df384dB85cD09E43e864D00A11533";
let managerAddress = "0xc1778DAAA1a6617Fa94A18f37061BA1C7C663806";
let nftFactoryAddress = "0x06fddbD58cb286DC1e7a9eB50eF67c9215478670";
let nftAddress = "0x9ceAB9b5530762DE5409F2715e85663405129e54";
let crownsAddress = "0xFde9cad69E98b3Cc8C998a8F2094293cb0bD6911";

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    console.log("Calling the init function...")
    let res = await init();

    callback(null, res);
};

let init = async function() {
    console.log("account is setting...")
    accounts = await web3.eth.getAccounts();

    let nftBrawl, manager;
    try {
        nftBrawl = await NftBrawl.at(nftBrawlAddress);
        manager = await NftBrawlManager.at(managerAddress);
    console.log("Nft brawl contract instance created");
    } catch(e) {
        console.log(e);
    }

    // after deploying contract for the first time. Only once should be called
    // await nftBrawl.transferOwnership(managerAddress);

    let sessionId = await nftBrawl.lastSessionId();
    console.log(sessionId +" session id started");

    // let nftBrawlOwner = await nftBrawl.owner();
    // let managerOwner = await manager.owner();
    // console.log("Nft brawl owner: "+nftBrawlOwner);
    // console.log("Manager owner: "+managerOwner);

    // await setAllRewards(manager);
    // console.log("Nft Brawl set the reward sizes");

    // let factory = await Factory.at(nftFactoryAddress);
    // console.log("Nft Factory contract instance was created");

    // let isGiven = await factory.isGenerator(nftBrawlAddress).catch(e => console.error);
    // if (!isGiven) {
        // await factory.addGenerator(nftBrawlAddress);
        // console.log("Nft Brawl was granted a permission by factory to mint Seascape NFT!");
    // }
    // console.log("Generator was set");

    //should start a session
    let startTime = parseInt(new Date(new Date().setUTCHours(0, 0, 0) + (3600 * 24 * 1000)) / 1000);

    await manager.startSession(interval,
				      period,
				      startTime,
				      generation,
				      {from: accounts[0], gasPrice: 6000000000});

    sessionId = await nftBrawl.lastSessionId();
    console.log(sessionId +" session id started");
}.bind(this);


// ------------------------------------------------------------
// Leaderboard related data
// ------------------------------------------------------------
let setAllRewards = async function(conc) {

    for (var i = 0; i<10; i++) {
        allTimeWinners[i] = web3.utils.toWei(allTimeWinners[i]);
        dailyWinners[i] = web3.utils.toWei(dailyWinners[i]);
    }

    await conc.setPrizes(dailyWinners, allTimeWinners, {gasPrice: 6000000000});

    console.log("Set all reward prizes");
};
