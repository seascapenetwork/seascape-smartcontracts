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

    // global vars
    let user = accounts[0];
    let sessionId = 1;              // need to update this field accordingly
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
