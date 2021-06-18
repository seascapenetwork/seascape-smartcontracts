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

    // global vars
    let user = accounts[1];
    let sessionId = 3;              // need to update this field accordingly
    let finney = 1000000000000000;
    let depositAmount = 1;
    console.log(`Using ${user}`);

    // manually deposit crowns to contract
    // await crowns.transfer(nftBurning.address, web3.utils.toWei(depositAmount.toString()),
    //     {from: accounts[0]});
    // console.log(`Transfered ${depositAmount} CWS`);

    // print balance before
    console.log("checking contract balance...");
    let balanceBefore = Math.floor(parseInt(await crowns.balanceOf(nftBurning.address))/finney);
    if (balanceBefore >0)
        console.log(`contract balance before calling withdraw function is ${balanceBefore} CWS (/1000)`);
    console.log("contract balance is 0");

    // call withdraw
    console.log("attemping to withdraw...")
    let withdrawn = await nftBurning.withdraw(sessionId, {from: user}).catch(console.error);

    // print balance after
    console.log("checking contract balance...");
    let balanceAfter = Math.floor(parseInt(await crowns.balanceOf(nftBurning.address))/finney);
    if (balanceAfter >0)
        console.log(`contract balance after calling withdraw function is ${balanceAfter} CWS (/1000)`);
    console.log("contract balance is 0");


}.bind(this);
