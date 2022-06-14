let NftStaking = artifacts.require("NftStaking");
let Nft = artifacts.require("SeascapeNft");

let accounts;

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = init(networkId);
    
    console.log("Claiming reward...!");

    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    
    let nftStaking = await NftStaking.deployed();

    let lastSessionId = await nftStaking.lastSessionId();
    
    let res = await claimAll(nftStaking, lastSessionId);
}.bind(this);


let claimAll = async function(nftStaking, lastSessionId) {
    let player = accounts[0];

    let gameOwner = accounts[0];

    //ERC721 approve and deposit token to contract
    let claim_res = await nftStaking.claimAll(lastSessionId, {from: player});

    console.log(`All NFT rewards claimed successfully.\nTxid: ${claim_res.tx}`);
}.bind(this);

