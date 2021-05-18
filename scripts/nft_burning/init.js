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

    let nftBurning = await NftBurning.at("0x8E38F57DF5595b506FBfaF8733B7E62E63FB8d39");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    let user = accounts[0];
    console.log(`Using ${user}`);

    // give factory permission
    let isGiven = await factory.isGenerator(nftBurning.address).catch(e => console.error);
    if (!isGiven) {
        await factory.addGenerator(nftBurning.address);
        console.log("Nft Rush was granted a permission by factory to mint Seascape NFT!");
    }

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
