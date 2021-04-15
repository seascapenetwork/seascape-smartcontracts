var accounts;
let NftRush = artifacts.require("NftRush");

/**
 * For test purpose, starts a game session
 */
module.exports = function(callback) {
    let res = init();
    
    callback(null, res);
};

let init = async function() {
    await web3.eth.getAccounts(function(err,res) { accounts = res; });
    let addr = accounts[0];

    return await simpleMsgSigning("1");
    //return await sampleMsgSigning(addr, "12345", 54321, 3);    
}.bind(this);

// signs a string with private key
let simpleMsgSigning = async function(str) {
    let addr = accounts[0];

    //let keccak = web3.utils.keccak256(str);

    let signature = await web3.eth.sign(str, addr);

    console.log(addr + " is signing:");
    console.log(`(string)=${str}`);
    console.log("signature:  "+signature);
};


let sampleMsgSigning = async function(walletAddr, amount, mintedTime, quality) {
    let addr = accounts[0];
    let nftRush = await NftRush.deployed();

    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
						[web3.utils.toWei(amount), mintedTime]);
    let bytes1 = web3.utils.bytesToHex([quality]);
    
    let str = addr + bytes32.substr(2) + bytes1.substr(2);
    let keccak = web3.utils.keccak256(str);

    let keccakContract = await nftRush.getHash(addr, web3.utils.toWei(amount), mintedTime, quality);

    let signature = await web3.eth.sign(keccak, addr);
    let signatureContract = await web3.eth.sign(keccakContract, addr);    

    console.log(addr + " is signing:");
    console.log(web3.utils.toWei(amount));
    console.log(`(uint256)amount=${amount}, (uint256)=${mintedTime}, (uint8)=${quality}`);
    console.log("Hashed Str:    "+str);
    console.log("hashed:     "+keccak);
    console.log(keccakContract);
    console.log("signature:  "+signature);
    console.log("signatureContract:  "+signatureContract);    
};
