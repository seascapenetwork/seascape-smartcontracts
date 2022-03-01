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
    let factory  = await Factory.at("0x06fddbD58cb286DC1e7a9eB50eF67c9215478670");
    let nft     = await Nft.at("0x9ceAB9b5530762DE5409F2715e85663405129e54");
    let nftBurning = await NftBurning.at("0x24F30161085c082A637fc3B6B7F3969455260CD1");


    // global variables
    let user = accounts[0];
    console.log(`Using ${user}`);

    console.log("attemping to set the factory...");
    let isGiven = false;
    try{
      isGiven = await factory.isGenerator(nftBurning.address);
    }catch(err){
      console.log(err);
    };
    console.log(isGiven);
    if (!isGiven) {
    await factory.addGenerator(nftBurning.address).catch(console.error);
    console.log("factory was set")
}
    // await nft.setFactory(factory.address).catch(console.error);
    // console.log("factory was set");


}.bind(this);
