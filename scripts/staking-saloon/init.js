let NftStaking = artifacts.require("NftStaking");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let totalReward = 500;
let period = 3600 * 24 * 7;   // 4 hour in seconds

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();

    console.log("Starting a script...");

    let res = await init(networkId);

    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log("Accounts were loaded in.");

    let nftStaking = null;
    let factory = null;
    let nft     = null;

    let crowns  = null;

    if (networkId == 4) {
        nftStaking = await NftStaking.at("0xd7512C46b665bd1c9E12D437dd9423F859db515A");
        factory = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
        nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
        crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");

  } else if (networkId == 1287) {
        nftStaking = await NftStaking.at("0x9CB160C1b80C2915b3833Bf71b7913FC785150dB");
        factory = await Factory.at("0x06fddbD58cb286DC1e7a9eB50eF67c9215478670");
        nft     = await Nft.at("0x9ceAB9b5530762DE5409F2715e85663405129e54");
        crowns  = await Crowns.at("0xFde9cad69E98b3Cc8C998a8F2094293cb0bD6911");

    } else {
        nftStaking = await NftStaking.at("0x29b0d9A9A989e4651488D0002ebf79199cE1b7C1");
        //factory = await Factory.at("0xa304D289f6d0a30aEB33e9243f47Efa3a9ad437d");
        //nft     = await Nft.deployed();
        //crowns  = await Crowns.at("0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B");
    }

    console.log("Smartcontracts were intialized");

    let gasPrice = await web3.eth.getGasPrice() * 2;
    let gasValue = 4700000;

    console.log(`Gas price: ${gasPrice/1e9}`);

    await crowns.transfer(nftStaking.address, web3.utils.toWei(totalReward.toString()), {from: accounts[0], gas: gasValue, gasPrice: gasPrice});
    console.log(`Transfered ${totalReward} CWS`);
    //return;

    //should add nft rush as generator role in nft factory
    //await factory.addGenerator(nftStaking.address, {from: accounts[0], gas: gasValue, gasPrice: gasPrice});
    //console.log("Allow staking saloon to burn nfts");
    //return;

    //should start a session
    let startTime = Math.floor(Date.now()/1000) + (60 * 5);
    let result = await nftStaking.startSession(web3.utils.toWei(totalReward.toString()),
        period,
        startTime,
	    {from: accounts[0], gas: gasValue, gasPrice: gasPrice});
    console.log(result);

    let sessionId = await nftStaking.lastSessionId();
    console.log(`Session id: ${sessionId} started`);
}.bind(this);
