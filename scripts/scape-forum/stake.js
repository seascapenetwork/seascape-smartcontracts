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
    let nftBurning = await NftBurning.at("0x4cd0babd70E6CFBc487F00DE1d6E032d10E134Bf");
    let crowns  = await Crowns.at("0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B");
    let factory  = await Factory.at("0x3eB88c3F2A719369320D731FbaE062b0f82F22e4");
    let nft     = await Nft.at("0x66638F4970C2ae63773946906922c07a583b6069");

    // global variables
    let user = accounts[0];
    let owner = accounts[0];
    let stakeInt = "500";
    let stakeAmount = web3.utils.toWei(stakeInt, "milli");
    let ether = 1000000000000000000;


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
    allowance = parseInt(allowance).toString() / ether;
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
