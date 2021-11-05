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
    let factory  = await Factory.at("0x693B804c37318eD5972840D10CDAe8Fbea8145f7");
    let nft     = await Nft.at("0x115Aa9E35564307365Ca3f215f67eB69886f2fD1");
    let riverboat = await Riverboat.at("0x5434BDc9de2005278532F9041cBf3C939E48C4DC");

    // global variables
    let user = accounts[0];
    console.log(`Using ${user}`);

    console.log("attempting to set nft...")
    await factory.setNft(nft.address, {from: user}).catch(console.error);
    console.log("nft was set");

    // console.log("attemping to set the factory...");
    // let isGiven = false;
    // try{
    //   isGiven = await factory.isGenerator(user);
    // }catch(err){
    //   console.log(err);
    // };
    // console.log(isGiven);
    // if (!isGiven) {
    // await factory.addGenerator(user).catch(console.error);
    // console.log("factory was set");
    // }

    console.log("attempting to set factory...");
    await nft.setFactory(factory.address, {from: user}).catch(console.error);
    console.log("factory was set");
}.bind(this);
