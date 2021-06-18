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

    // contracts
    let nftBurning = await NftBurning.at("0x3577d8f8cA9BFB1b9ab2d20C572826De1458516f");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");

    // global variables
    let user = accounts[1];
    let owner = accounts[0];
    let stakeInt = "200";
    let stakeAmount = web3.utils.toWei(stakeInt, "milli");


    // print current account and sessionId
    console.log(`Using ${user}`);
    let sessionId = await nftBurning.lastSessionId.call();
    sessionId = parseInt(sessionId);
    console.log("last session id: " ,sessionId);


    // set value manually
    // let sessionId = 2;


    // approve transfer of crowns and check allowance
    console.log(`approving nftBurning to spend crowns...`);
    await crowns.approve(nftBurning.address, stakeAmount, {from:user})
    .catch(console.error);
    let allowance = await crowns.allowance(user, nftBurning.address);
    allowance = parseInt(allowance).toString() / 1000000000000000000;
    console.log(`nftBurning was approved to spend ${allowance} crowns`);


    // stake crowns
    console.log(`Calling the stake function...`);
    let stakeCrowns = await nftBurning.stake(
        sessionId,
        stakeAmount,
        {from: user})
        .catch(console.error);
    console.log("Crowns were staked");


}.bind(this);
