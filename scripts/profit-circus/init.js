let ProfitCircus = artifacts.require("./ProfitCircus.sol");
let Crowns = artifacts.require("CrownsToken");
let Factory = artifacts.require("NftFactory");
let ScapeNft = artifacts.require("SeascapeNft");

let accounts;

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);

    callback(null, res);
};

let init = async function() {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    // // rinkeby
    // let profitCircus    = await ProfitCircus.at("0x9Ee9fb0930f2B5e3Dd4ad1BA2edB87D8549A9e07").catch(console.error);
    // let factory         = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0").catch(console.error);
  	// let crowns          = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D").catch(console.error);

    // // rinkeby v2
    // let profitCircus       = await ProfitCircus.at("0x1C9F8cF1bcC7900Ea784E4b8312c6eFc250958F6");
    // let factory            = await Factory.at("0xCbd3DC2765bd7F39a8EAd2586449558a0A82294c");
    // let crowns             = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    // let scapeNft           = await ScapeNft.at("0xC1e3FA7c5550a5CE0e1f03F30a37f51139248478");

    // // moonbase
    // let profitCircus    = await ProfitCircus.at("0xa7a98F2BCa3dFe72010841cE6B12Ce4810D0f8F4");
    // let factory         = await Factory.at("0x4b692990607c5CbF7c12a8aa309FDb9042D94475");
    // let crowns          = await Crowns.at("0xb3B32cBF0397AB03018504404EB1DDcd3a85cCB6");
    // let scapeNft        = await ScapeNft.at("0xB69aA417a1283618AACc0EAE123a1e01dE84f4AA");

    // // moonriver
    let profitCircus1         = await ProfitCircus.at("0x717d834132193FE0FDFeAcD33ed3e39C9ad51Bee").catch(console.error);
    let factory               = await Factory.at("0x77478212aa57A7A9Cc5b611156Fce7c0697578fb").catch(console.error);
    // let scapeNft           = await ScapeNft.at("0x607cBd90BE76e9602548Fbe63931AbE9E8af8aA7").catch(console.error);

    // Binance Smart Chain
    // let profitCircus1     = await ProfitCircus.at("0xb3f71a6d1D98F64518070f7F4493CB5C61497452").catch(console.error);
    // let profitCircus2     = await ProfitCircus.at("0xdF704B850BFa18dCB3B92222181E5f306ac36b65").catch(console.error);
    // let factory           = await Factory.at("0xf92186992be668093E5F158b39F88c7985108b27").catch(console.error);
    // let scapeNft          = await ScapeNft.at("0xc54b96b04AA8828b63Cf250408E1084E9F6Ac6c8").catch(console.error);

    console.log("Set the contracts");

    // uncomment the following block if you just deployed Scape NFT too.
    // console.log("Adding factory to nft...");
    // await scapeNft.setFactory(factory.address).catch(console.error);
    // console.log("Added factory to nft");

    // uncomment the following block if you just deployed Profit Circus contracts
    console.log("adding profitCircus 1 to factory..");
    let yes = await factory.isStaticUser(profitCircus1.address).catch(console.error);
    console.log(yes);
    // return;

    await factory.addStaticUser(profitCircus1.address).catch(console.error);
    console.log("Profit Circus 1 contract got a permission to mint nfts, now adding profit circus 2");
    // await factory.addStaticUser(profitCircus2.address).catch(console.error);
    // console.log("Profit Circus 2 contract got a permission to mint nfts!");
    return;

    // uncomment the following block if you want to transfer from the Profit Circus owner's balance the reward token
    // should transfer reward amount to contract
    // console.log("transfering reward to profitCircus..");
    // await crowns.transfer(profitCircus.address, reward, {from: accounts[0]}).catch(console.error);
    // console.log("Crowns for session were transferred to the Lp Mining smartcontract");

    // pCWS staking test session
    // Session time: 1 hour
    // NFT claiming CD: 10 mins
    // NFT claiming requirement: 100 pCWS
    // Reward Pool: 1 pCWS

    // pCWS-BNB LP staking test session
    // Session time: 1 hour
    // NFT claiming CD: 10 mins
    // NFT claiming requirement: 1 pCWS-BNB LP
    // Reward Pool: 1 pCWS

    // address _rewardToken, 
    // address _lpToken,  
    // uint256 _totalReward, 
    // uint256 _period,  
    // uint256 _startTime, 
    // uint256 _generation, 
    // uint256 _stakeAmount, 
    // uint256 _stakePeriod

    console.log("starting the session...");
    let rewardToken = "0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd";     // for both profit circus 1, and profit circus 2
    let lpToken1 = "0xbcf39f0edda668c58371e519af37ca705f2bfcbd";     // pCWS
    let lpToken2 = "0x6615ce60d71513aa4849269dd63821d324a23f8c";    // pCWS-BNB lp
    let startTime = Math.floor(new Date().getTime()/1000) + 200;
    let period = 7776000;                 // 90 days
    let generation = 3;
    let stakePeriod = 86400;    // 24 hours
    let stakeAmount1 = web3.utils.toWei("100", "ether");
    let stakeAmount2 = web3.utils.toWei("1", "ether");
    let reward1 = web3.utils.toWei("10000", "ether");
    let reward2 = web3.utils.toWei("50000", "ether");

    console.log(`Start time of Season: ${startTime}...`);
    await profitCircus1.startSession(rewardToken, lpToken1, reward1, period, startTime, generation, stakeAmount1, stakePeriod)
      .catch(console.error);
    console.log("Session started for Profit circus 1, now setting profit circus 2");
    await profitCircus2.startSession(rewardToken, lpToken2, reward2, period, startTime, generation, stakeAmount2, stakePeriod)
    .catch(console.error);
    console.log("Session started for Profit circus 2");

    // uncomment the block if you want to check the Session ID
    // console.log("fetching sessionId..");
    // let sessionId = await profitCircus.lastSessionIds.call(crowns.address);
    // console.log(sessionId +" session id for "+crowns.address);

    return true;
}.bind(this);
