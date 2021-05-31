let NftBurning = artifacts.require("NftBurning");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");


let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nftBurning = await NftBurning.at("0x0f539c3C550AD30B27572536D1BcE9DC2c56d425");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    let owner = accounts[0];
    console.log(`Using ${owner}`);

    // give factory permission
    // let isGiven = await factory.isGenerator(nftBurning.address).catch(e => console.error);
    // if (!isGiven) {
    //     await factory.addGenerator(nftBurning.address);
    //     console.log("Nft Rush was granted a permission by factory to mint Seascape NFT!");
    // }

    // startSession parameters
    let startTime = Math.floor(Date.now()/1000) + 50;
    let period = 600; // one day
    let generation = 1;
    let interval = 180; // 3 minutes
    let fee = web3.utils.toWei("1", "ether");
    let minStake = web3.utils.toWei("100", "milli"); // 0.1 ether
    let maxStake = web3.utils.toWei("1", "ether");


    console.log("attemping to start a session");
    let sessionStarted = await nftBurning.startSession(
        startTime,
        period,
        generation,
        interval,
        fee,
        minStake,
        maxStake,
	    {from: owner})
      .catch(console.error);
    console.log("Started a new session");


}.bind(this);
