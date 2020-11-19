let NftRush = artifacts.require("NftRush");
let LpToken = artifacts.require("LP_Token");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNFT");
let Factory = artifacts.require("NFTFactory");
let Staking = artifacts.require("Staking");
let NftStaking = artifacts.require("NftStaking");

module.exports = function(callback) {
    let res = init();    
};

let init = async function() {
    let nftRush = await NftRush.deployed();
    let crowns = await Crowns.deployed();
    let nft = await Nft.deployed();
    let factory = await Factory.deployed();
    let staking = await Staking.deployed();
    let nftStaking = await NftStaking.deployed();

    console.log("Nft Rush:    "+nftRush.address);
    console.log("Crowns:      "+crowns.address);
    console.log("Nft:         "+nft.address);
    console.log("Factory:     "+factory.address);
    console.log("Staking:     "+staking.address);
    console.log("Nft Staking: "+nftStaking.address);
    
    return true;
}.bind(this);
