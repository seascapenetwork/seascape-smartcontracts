let NftStaking = artifacts.require("NftStaking");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let totalReward = 30000;
let period = 3600 * 24 * 21;   // 4 hour in seconds

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();

    console.log("Starting a script...");

    let res = await init(networkId);
    
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(`Logged in as ${accounts[0]}.`);

    // Fee Collector of Staking Saloon on Moonriver.
    let newOwner = "0x3d8f6999BE756545174898Ee4387F0Bc4D73DCDf";
	
    let crowns = await Crowns.at("0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd");
    let nftStaking = await NftStaking.at("0x29b0d9A9A989e4651488D0002ebf79199cE1b7C1");	

    console.log("Smartcontracts were intialized");

    // await crowns.transfer(newOwner, web3.utils.toWei("0.07", "ether")).catch(console.error);
    // console.log(`'Crowns were transferred`);

    let owner = await crowns.owner().catch(console.error);
    console.log(`Crowns Owner: ${owner}`);

    // await nftStakingChange(nftStaking, newOwner);
}.bind(this);

let nftStakingChange = async function(nftStaking, newOwner) {
    let owner = await nftStaking.owner().catch(console.error);
    console.log(`Owner of Staking Saloon: ${owner}`);

    // await nftStaking.transferOwnership(newOwner).catch(console.error);

    // console.log(`Ownership was transferred!`);
}