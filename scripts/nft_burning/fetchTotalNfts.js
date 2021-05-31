let NftBurning = artifacts.require("NftBurning");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");




module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    let accounts = await web3.eth.getAccounts();
    let nft = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let user = accounts[1];

    console.log(`Using ${user}`);

    //fetch nft balance
    let balance = await nft.balanceOf(user);
    console.log(`User owns ${balance} nfts`);


}.bind(this);
