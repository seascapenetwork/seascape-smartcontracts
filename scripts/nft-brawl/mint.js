let NftRush = artifacts.require("NftRush");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

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
    //let quality = getRandomInt(5) + 1;
    let quality = 2;

    let addr = accounts[0];
    
    let balance = await nftRush.balances(lastSessionId, addr);
    let amountWei = web3.utils.toWei(web3.utils.fromWei(balance.amount));
    let mintedTime = parseInt(balance.mintedTime.toString());

    console.log("Parameters: addr, amount, minted time, quality:  ", addr, amountWei, mintedTime, quality);
    console.log("Signer: "+addr);

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

    console.log("Signature: "+hash);

    let res = await nftRush.mint(lastSessionId, v, r, s, quality);
    console.log(res);
    return res;
}.bind(this);

let sampleMsgSigning = async function() {
    let addr = accounts[0];

    let raw256_1 = 12345;
    let raw256_2 = 54321;
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
						[raw256_1, raw256_2]);
    let quality = 3;
    let bytes1  = web3.utils.bytesToHex([quality]);

    let keccak = web3.utils.keccak256(bytes1);
    let signature = await web3.eth.sign(data, addr);

    console.log(addr + " is signing:");
    console.log("Quality:    "+quality);
    console.log("as hex:     "+bytes1);
    console.log("hashed:     "+keccak);
    console.log("signature:  "+signature);
};

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
