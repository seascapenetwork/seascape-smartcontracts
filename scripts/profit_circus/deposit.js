let ProfitCircus = artifacts.require("ProfitCircus");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let depositInt = "1";
let depositAmount = web3.utils.toWei(depositInt, "ether");


/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);

    callback(null, res);
};

let init = async function(networkId) {

    let accounts = await web3.eth.getAccounts();
    console.log(accounts);

    // // rinkeby
    // let profitCircus    =  await ProfitCircus.at("0x9Ee9fb0930f2B5e3Dd4ad1BA2edB87D8549A9e07").catch(console.error);
  	// let crowns          = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D").catch(console.error);

    // rinkeby v2
    let profitCircus       = await ProfitCircus.at("0x1C9F8cF1bcC7900Ea784E4b8312c6eFc250958F6");
    let crowns             = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    
    // // moonbase
    // let profitCircus    = await ProfitCircus.at("0xa7a98F2BCa3dFe72010841cE6B12Ce4810D0f8F4");
    // let crowns          = await Crowns.at("0xb3B32cBF0397AB03018504404EB1DDcd3a85cCB6");

    let lastSessionId = 1;
    console.log("lastSessionId: ", parseInt(lastSessionId));

    let balance = await crowns.balanceOf(accounts[0]);
    console.log("cws balance: " , parseInt(balance));

    //should approve nft rush to spend cws of player
    console.log("attemping to approve");
    await crowns.approve(profitCircus.address, depositAmount, {from: accounts[0]}).catch(console.error);

    //should spend CWS in nft rush
    console.log("attemping to deposit");
    await profitCircus.deposit(lastSessionId, depositAmount, {from: accounts[0]})
      .catch(console.error);

    console.log("Deposited");
}.bind(this);
