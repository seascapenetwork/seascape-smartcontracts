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
    let res = await factory.addStaticUser(address);
    console.log(res);
    console.log(`Account ${address} was granted a STATIC role in Nft Factory`);
    return res;
}.bind(this);

let init = async function() {
    accounts = await web3.eth.getAccounts();
    console.log(`TX executer: ${accounts[0]}`);

    let factory = await Factory.at(factoryAddress);

    // Change the ownership:
    let newAdmin = "0x191a424af6F23dEcC64791C65aa9C7088ccD6913";
    let newAdmin2 = "0xCD4cEdf0Dd2e00635f948277A0973BFC1F06482b";

    // make him as minter and static user
    // Uncomment if you want to grant a permission.
    await grantPermission(factory, newAdmin);
    await grantPermission(factory, newAdmin2);
    console.log("Got a permission to mint nfts");
};
