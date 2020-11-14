var accounts;

/**
 * For test purpose, starts a game session
 */
module.exports = function(callback) {
    let res = init();
    
    callback(null, res);
};

let init = async function() {
    await web3.eth.getAccounts(function(err,res) { accounts = res; });
    return await sampleMsgSigning();
}.bind(this);

let sampleMsgSigning = async function() {
    let addr = accounts[0];

    let raw256_1 = 12345;  // amount wei
    let raw256_2 = 54321;  // minted time
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
						[raw256_1, raw256_2]);
    let quality = 3;
    let bytes1  = web3.utils.bytesToHex([quality]);
    
    let str = addr + bytes32.substr(2) + bytes1.substr(2);
    let keccak = web3.utils.keccak256(str);
    let signature = await web3.eth.sign(keccak, addr);

    console.log(addr + " is signing:");
    console.log("Str:    "+str);
    console.log("hashed:     "+keccak);
    console.log("signature:  "+signature);
};
