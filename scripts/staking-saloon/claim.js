let NftStaking = artifacts.require("NftStaking");
let Nft = artifacts.require("SeascapeNft");

let accounts;

let slotIndex = 1;

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
    
    let res = await claim(nftStaking, lastSessionId);
}.bind(this);


let claim = async function(nftStaking, lastSessionId) {
    let player = accounts[0];

    let gameOwner = accounts[0];

    let args = process.argv.slice(4);
    if (args.length == 1) {
	slotIndex = parseInt(args[0]);
	if (slotIndex < 0 || slotIndex > 2) {
	    throw "Slot index should be between 0 and 2";
	    process.exit(1);
	}
    }

    console.log(`Claiming Nft at slot index  ${slotIndex}`);

    //ERC721 approve and deposit token to contract
    let claim_res = await nftStaking.claim(lastSessionId, slotIndex, {from: player});

    console.log(`NFT claimed successfully.\nTxid: ${claim_res.tx}`);
}.bind(this);

