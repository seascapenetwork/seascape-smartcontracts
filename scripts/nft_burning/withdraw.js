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
    let nftBurning = await NftBurning.at("0x2D8f2dE35197e170a69B31DAeFDDFDb24EA56166");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");

    // global vars
    let user = accounts[1];
    let sessionId = 5;              // need to update this field accordingly
    let ether = 1000000000000000000;
    console.log(`Using ${user}`);

    // manually deposit crowns to contract
    // let depositAmount = 1;
    // await crowns.transfer(nftBurning.address, web3.utils.toWei(depositAmount.toString()),
    //     {from: accounts[0]});
    // console.log(`Transfered ${depositAmount} CWS`);

    // print balance before
    console.log("checking contract balance...");
    let balanceBefore = parseInt(await crowns.balanceOf(nftBurning.address))/ether;
    //balanceBefore = Math.floor(balanceBefore);
    if (balanceBefore >0)
        console.log(`contract balance before calling withdraw function is ${balanceBefore} CWS`);
    else
        console.log("contract balance is 0");

    // call withdraw
    console.log("attemping to withdraw...")
    let withdrawn = await nftBurning.withdraw(sessionId, {from: user}).catch(console.error);
    console.log("successfully withdrawn crowns")

    // print balance after
    console.log("checking contract balance...");
    let balanceAfter = parseInt(await crowns.balanceOf(nftBurning.address))/ether;
    if (balanceAfter >0)
        console.log(`contract balance after calling withdraw function is ${balanceAfter} CWS`);
    else
        console.log("contract balance is 0");


}.bind(this);
