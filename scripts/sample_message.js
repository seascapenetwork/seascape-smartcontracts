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
    let addr = accounts[0];

    return await sampleMsgSigning(addr, "40", 0, 1);
}.bind(this);

let sampleMsgSigning = async function(walletAddr, amount, mintedTime, quality) {
    let addr = accounts[0];
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
						[web3.utils.toWei(amount), mintedTime]);
    let bytes1 = web3.utils.bytesToHex([quality]);
    
    let str = addr + bytes32.substr(2) + bytes1.substr(2);
    let keccak = web3.utils.keccak256(str);
    let signature = await web3.eth.sign(keccak, addr);

    console.log(addr + " is signing:");
    console.log("Str:    "+str);
    console.log("hashed:     "+keccak);
    console.log("signature:  "+signature);
};
