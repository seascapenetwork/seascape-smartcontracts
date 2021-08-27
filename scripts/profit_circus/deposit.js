let ProfitCircus = artifacts.require("ProfitCircus");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let depositInt = "5";
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

    let profitCircus    =  await ProfitCircus.at("0xfb96487f0dC8ecad503C5E575E1d23d837475f25");
    let lpToken  = await LpToken.at("0xb0CD1a0C95497d822780e763253A4532d6C63369");
    let crowns = await Crowns.at("0xfC3C4136f8b2E19a6a759601D1aa4e29A8A502A1");
    let nft = await Nft.at("0xf0c27DB379AD997C225701EAf00344693B4b36e1");


    let lastSessionId = 1;
    console.log("lastSessionId: ", parseInt(lastSessionId));


    let balance = await crowns.balanceOf(accounts[0]);
    console.log("cws balance: " ,parseInt(balance));

    //should approve nft rush to spend cws of player
    console.log("attemping to approve");
    await crowns.approve(profitCircus.address, depositAmount, {from: accounts[0]}).catch(console.error);

    //should spend CWS in nft rush
    console.log("attemping to deposti");
    let deposited = await profitCircus.deposit(lastSessionId, depositAmount, {from: accounts[0]})
      .catch(console.error);


}.bind(this);
