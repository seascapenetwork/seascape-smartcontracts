let Nft = artifacts.require("SeascapeNft");

// EDIT THE NONCE, GET NONCE from etherscan
let nonce = 7;

module.exports = async function() {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let transactionObject = {
        to: accounts[0],
        from: accounts[0],
        value: 0,
        gasPrice: 100000000000, // 100 gwei
		gas: 6721975,
        nonce: nonce
    }

    await web3.eth.sendTransaction(transactionObject, console.log);
};
