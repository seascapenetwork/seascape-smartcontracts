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

    let nftBurning = await NftBurning.at("0x0f539c3C550AD30B27572536D1BcE9DC2c56d425");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    //global variables
    let user = accounts[0];
    console.log(`Using ${user}`);

console.log("attemping to set the factory.");
// let isGiven = false;
// try{
//   isGiven = await factory.isGenerator(nftBurning.address);
// }catch(err){
//   console.log(err);
// };
// console.log(isGiven);
// if (!isGiven) {
    await factory.addGenerator(nftBurning.address).catch(console.error);
    console.log("factory was set.")
// }

}.bind(this);
