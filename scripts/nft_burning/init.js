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

    let nftBurning = await NftBurning.at("0x6b536Fa6c542DBFe1E8Eb0b65aB64D50544a6DF3");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    let user = accounts[0];
    console.log(`Using ${user}`);


    //should start a session
    let startTime = Math.floor(Date.now()/1000) + 40;
    let period = 604800; // one week
    let generation = 1;
    let interval = 150; // 2.5 minutes
    let fee = web3.utils.toWei("1", "ether");
    let sessionStarted = await nftBurning.startSession(
        startTime,
        period,
        generation,
        interval,
        fee,
	    {from: user})
      .catch(console.error);
    console.log("Started a nft staking session");


}.bind(this);
