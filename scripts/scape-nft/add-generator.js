let Factory = artifacts.require("NftFactory");
let Nft = artifacts.require("SeascapeNft");

// rinkeby testnet
// let factoryAddress = '0x3eB88c3F2A719369320D731FbaE062b0f82F22e4';
// let gasPrice = 136000000000;

// bsc mainnet
let factoryAddress = '0xa304D289f6d0a30aEB33e9243f47Efa3a9ad437d';

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();

    let res = await init(networkId);

    callback(null, res);
};

let grantPermission = async function(factory, address) {
    let res = await factory.addGenerator(address);
    console.log(res);
    console.log(`Account ${address} was granted a GENERATOR role in Nft Factory`);
    return res;
}.bind(this);

let init = async function() {
    accounts = await web3.eth.getAccounts();
    console.log(`TX executer: ${accounts[0]}`);

    let factory = await Factory.at(factoryAddress);

    // Change the ownership:
    let newAdmin = "0xc6593E8BF5e517704fbd220EcB638118Da5E3bE5";

    // make him as minter and static user
    // Uncomment if you want to grant a permission.
    await grantPermission(factory, newAdmin);
    console.log("Got a permission to mint nfts");
};
