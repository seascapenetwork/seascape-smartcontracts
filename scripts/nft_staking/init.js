let NftStaking = artifacts.require("NftStaking");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let totalReward = 250;
let period = 3600 * 24 * 2;   // 2 week 
let generation = 0;

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();

    let nftStaking = null;
    let factory = null;
    let nft     = null;

    let crowns  = null;
	
    if (networkId == 4) {
        nftStaking = await NftStaking.at("0xf01AB6f972f987Ad9262466F955dF979A1d6F93F");	
        factory = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
        nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");

        crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");	
    } else {
        nftStaking = await NftStaking.deployed();
        factory = await Factory.deployed();
        nft     = await Nft.deployed();

        crowns  = await Crowns.deployed();
    }

    let gasPrice = await web3.eth.getGasPrice();
    let gasValue = 4700000;

    await crowns.transfer(nftStaking.address, web3.utils.toWei(totalReward.toString()), {from: accounts[0], gas: gasValue, gasPrice: gasPrice});    
    console.log(`Transfered ${totalReward} CWS`);

    //should add nft rush as generator role in nft factory
    await factory.addGenerator(nftStaking.address, {from: accounts[0], gas: gasValue, gasPrice: gasPrice});
    console.log("Allow staking saloon to burn nfts");

    //should start a session
    let startTime = Math.floor(Date.now()/1000) + 30;
    await nftStaking.startSession(web3.utils.toWei(totalReward.toString()),
        period,
        startTime,
	    {from: accounts[0], gas: gasValue, gasPrice: gasPrice});
    console.log("Started a nft staking session");
}.bind(this);
