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

    let nftBurning = await NftBurning.at("0x7f2FFe308eb757DEf7ad532c81C8ae659dDCc8Bc");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");

    //global variables
    let user = accounts[1];
    let owner = accounts[0];
    let sessionId = 1;
    let depositInt = "10";
    let depositAmount = web3.utils.toWei(depositInt, "ether");

    console.log(`Using ${user}`);

    // approve transfer of crowns and check allowance
    await crowns.approve(nftBurning.address, depositAmount, {from:user})
    .catch(console.error);
    let allowance = await crowns.allowance(user, nftBurning.address);
    allowance = parseInt(allowance).toString();
    allowance = allowance / 1000000000000000000;
    console.log(`nftBurning was approved to spend ${allowance} crowns`);


    // stake crowns
    let stakeCrowns = await nftBurning.stake(
        sessionId,
        depositAmount,
        {from: user})
        .catch(console.error);
    console.log("Crowns were staked");


}.bind(this);
