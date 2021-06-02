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

    let nftBurning = await NftBurning.at("0x4B9f2881761db5353A2A4DFF498B1764C5B85067");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    let user = accounts[1];
    let sessionId = 1;
    let finney = 1000000000000000;
    let depositAmount = 1;
    console.log(`Using ${user}`);

    // manually deposit crowns to contract
    // await crowns.transfer(nftBurning.address, web3.utils.toWei(depositAmount.toString()),
    //     {from: accounts[0]});
    // console.log(`Transfered ${depositAmount} CWS`);

    // PRINT BALANCE BEFORE
    let balanceBefore = Math.floor(parseInt(await crowns.balanceOf(nftBurning.address))/finney);
    console.log("contract balance before calling withdraw function: " ,balanceBefore);

    // call withdraw
    let withdrawn = await nftBurning.withdraw(sessionId, {from: user})
      .catch(console.error);
    //console.log(`Withdrawn ${difference} crowns.`);

    // PRINT BALANCE AFTER
    let contractBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(nftBurning))/finney);
    console.log(contractBalanceAfter);

}.bind(this);
