let NftStaking = artifacts.require("NftStaking");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let totalReward = 10000;
let period = 3600 * 24 * 14;   // 1 week 
let generation = 0;
let rewardPrize = 10; // first winner gets 10 CWS
let winnersAmount = 10; // ten winners are tracked

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = init(networkId);
    console.log("Session started successfully");
    
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nftStaking = null;
    let factory = null;
    let nft     = null;

    let crowns  = null;
	
    if (networkId == 4) {
	nftStaking = await NftStaking.at("0xaA7ff46b1EcC3cD8512394ED7aF80339c0859185");	
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

    //should add nft rush as generator role in nft factory
    await factory.addGenerator(nftStaking.address, {from: accounts[0], gas: gasValue, gasPrice: gasPrice});

    //should set nft factory in nft
    await nft.setFactory(factory.address, {from: accounts[0], gas: gasValue, gasPrice: gasPrice});

    //should start a session
    let startTime = Math.floor(Date.now()/1000) + 30;
    await nftStaking.startSession(web3.utils.toWei(totalReward.toString()),
				      period,
				      startTime,
				      generation,
			       {from: accounts[0], gas: gasValue, gasPrice: gasPrice});
    console.log("Started a nft staking session");
}.bind(this);
