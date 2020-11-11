let NftRush = artifacts.require("NftRush");
let LpToken = artifacts.require("LP_Token");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNFT");
let Factory = artifacts.require("NFTFactory");

var accounts;

/**
 * For test purpose, starts a game session
 */
module.exports = function(callback) {
    let res = init();
    console.log("Nft for deposit was claimed successfully!");
    
    callback(null, res);
};

let init = async function() {
    web3.eth.getAccounts(function(err,res) { accounts = res; });
    let nftRush = await NftRush.deployed();
    
    let lastSessionId = await nftRush.lastSessionId();
    return await claimNft(nftRush, lastSessionId);
}.bind(this);

//should claim random nft
let claimNft = async function(nftRush, lastSessionId) {
    let quality = getRandomInt(5) + 1;
    let addr = accounts[0];
    
    let balance = await nftRush.balances(lastSessionId, addr);
    let amountWei = web3.utils.toWei(web3.utils.fromWei(balance.amount));
    let mintedTime = parseInt(balance.mintedTime.toString());
	
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
						[amountWei, mintedTime]);
    
    let bytes1 = web3.utils.bytesToHex([quality]);
    let str = addr + bytes32.substr(2) + bytes1.substr(2);
    let data = web3.utils.keccak256(str);
    let hash = await web3.eth.sign(data, addr);
    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
	v += 27;
    }

    let res = await nftRush.claim(lastSessionId, v, r, s, quality);
    return res;
}.bind(this);

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
