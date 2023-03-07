let Factory = artifacts.require("NftFactory");
let Nft = artifacts.require("SeascapeNft");

// rinkeby testnet
// let factoryAddress = '0x3eB88c3F2A719369320D731FbaE062b0f82F22e4';
// let gasPrice = 136000000000;

// bsc mainnet
// let factoryAddress = '0xa304D289f6d0a30aEB33e9243f47Efa3a9ad437d';

// moonriver
let factoryAddress = '0x77478212aa57A7A9Cc5b611156Fce7c0697578fb';

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

    let minter1 = "0x3e8093605B53520641257F5881E6E6C73965Ca9B";
    let minter2 = "0x0912F1cac7BEEEe0eA1Ff717Bd435B3d81E5fa7A";
    let minter3 = "0xfa88907811321BacC79B0533100fF25AdE11B673";

    // make him as minter and static user
    // Uncomment if you want to grant a permission.
    await grantPermission(factory, minter1);
    console.log("Got a permission to mint nfts 1");
    await grantPermission(factory, minter2);
    console.log("Got a permission to mint nfts 2");
    await grantPermission(factory, minter3);
    console.log("Got a permission to mint nfts 3");
};
