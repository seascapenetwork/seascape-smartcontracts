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

    let nftBurning = await NftBurning.at("0x4cd0babd70E6CFBc487F00DE1d6E032d10E134Bf");
    let crowns  = await Crowns.at("0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B");
    let factory  = await Factory.at("0x3eB88c3F2A719369320D731FbaE062b0f82F22e4");
    let nft     = await Nft.at("0x66638F4970C2ae63773946906922c07a583b6069");

    // show current account
    let owner = accounts[0];
    console.log(`Using ${owner}`);


    // startSession parameters
    let startTime = Math.floor(Date.now()/1000) + 60;
    let period = 600; // one day * 5
    let generation = 1;
    let interval = 120; // 5 minutes
    let fee = web3.utils.toWei("1", "ether");
    let minStake = web3.utils.toWei("100", "milli"); // 0.1 ether
    let maxStake = web3.utils.toWei("1", "ether");


    // call startSession
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
