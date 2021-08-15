let NftBrawl = artifacts.require("NftRush");
let NftBrawlManager = artifacts.require("NftBrawlManager");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let interval = 120;  // 0.5 minutes
let period = 3600 * 24 * 1;   // 1 day 
let generation = 0;
let dailyWinners = ["120", "50", "30", "15", "10", "5", "5", "5", "5", "5"];
let allTimeWinners = ["2000", "1000", "500", "300", "300", "300", "200", "200", "100", "100"];
let nftBrawlAddress = "0x48AB61eaa4333d7e05B595F42C52A9E92167Eaf1";
let managerAddress = "0xc1778DAAA1a6617Fa94A18f37061BA1C7C663806";
let nftFactoryAddress = "0xc2DED3bCDB5Ee215Ae384903B99a34937DCBF47d";
let nftAddress = "0xbd23fCD60bD2682dea6A3aad84b498c54d56c494";
let crownsAddress = "0x93E5529e91f586F70631ce8B2BcCA8d8053D2289";    

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
