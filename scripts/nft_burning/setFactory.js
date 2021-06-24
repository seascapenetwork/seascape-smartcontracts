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
    console.log(`Using ${user}`);

    console.log("attemping to set the factory...");
    // let isGiven = false;
    // try{
    //   isGiven = await factory.isGenerator(nftBurning.address);
    // }catch(err){
    //   console.log(err);
    // };
    // console.log(isGiven);
    // if (!isGiven) {
    await factory.addGenerator(nftBurning.address).catch(console.error);
    console.log("factory was set")
// }

}.bind(this);
