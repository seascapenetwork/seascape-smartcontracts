let Riverboat = artifacts.require("Riverboat");
let Nft = artifacts.require("RiverboatNft");
let Factory = artifacts.require("RiverboatFactory");


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
    let factory  = await Factory.at("");
    let nft     = await Nft.at("");
    let riverboat = await Riverboat.at("");

    // global variables
    let user = accounts[0];
    console.log(`Using ${user}`);

    console.log("attemping to set the factory...");
    let isGiven = false;
    try{
      isGiven = await factory.isGenerator(riverboat.address);
    }catch(err){
      console.log(err);
    };
    console.log(isGiven);
    if (!isGiven) {
    await factory.addGenerator(riverboat.address).catch(console.error);
    console.log("factory was set")
}
    // await nft.setFactory(factory.address).catch(console.error);
    // console.log("factory was set");
}.bind(this);
