let ProfitCircus = artifacts.require("./ProfitCircus.sol");
let Crowns = artifacts.require("CrownsToken");
let Factory = artifacts.require("NftFactory");
let ScapeNft = artifacts.require("SeascapeNft");

let accounts;
let reward = web3.utils.toWei("1", "ether");  // cws
let period = 1200;
let generation = 1;

let stakeAmount = web3.utils.toWei("1", "ether"); // 1 LP token in ETHER format.
let stakePeriod = 10;

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
    // let profitCircus    = await ProfitCircus.at("0x805C8922b408234f5208779053D06D7E8A8d74BC").catch(console.error);
    // let factory         = await Factory.at("0x77478212aa57A7A9Cc5b611156Fce7c0697578fb").catch(console.error);
    // let scapeNft        = await ScapeNft.at("0x607cBd90BE76e9602548Fbe63931AbE9E8af8aA7").catch(console.error);

    console.log("Set the contracts");

    console.log("Adding factory to nft");
    await scapeNft.setFactory(factory.address).catch(console.error);
    console.log("Added factory to nft");

    console.log("adding profitCircus to factory..");
    await factory.addStaticUser(profitCircus.address).catch(console.error);
    console.log("Profit Circus contract got a permission to mint nfts");

    // should transfer reward amount to contract
    console.log("transfering reward to profitCircus..");
    await crowns.transfer(profitCircus.address, reward, {from: accounts[0]}).catch(console.error);
    console.log("Crowns for session were transferred to the Lp Mining smartcontract");

    console.log("starting the session..");
    let startTime = Math.floor(new Date().getTime()/1000) + 30;
    await profitCircus.startSession(crowns.address, crowns.address, reward, period, startTime, generation, stakeAmount, stakePeriod)
      .catch(console.error);
    console.log("Session started");

    console.log("fetching sessionId..");
    let sessionId = await profitCircus.lastSessionIds.call(crowns.address);
    console.log(sessionId +" session id for "+crowns.address);

    return true;
}.bind(this);
