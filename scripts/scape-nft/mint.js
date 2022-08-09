let Factory = artifacts.require("NftFactory");
let Nft = artifacts.require("SeascapeNft");

// rinkeby testnet
// let factoryAddress = '0x3eB88c3F2A719369320D731FbaE062b0f82F22e4';
// let gasPrice = 136000000000;

// bsc mainnet
let factoryAddress = '0xa304D289f6d0a30aEB33e9243f47Efa3a9ad437d';
// let gasPrice = 5000000000;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();

    let res = await init(networkId);

    callback(null, res);
};

let min = 1;
let max = 5;

let grantPermission = async function(factory, address) {
    let res = await factory.addGenerator(address);
    console.log(res);
    console.log(`Account ${address} was granted a GENERATOR role in Nft Factory`);
    return res;
}.bind(this);

let staticPermission = async function(factory, address) {
    let res = await factory.addStaticUser(address);
    console.log(res);
    console.log(`Account ${address} granted a GENERATOR permission in Nft Factory`);
    return res;
}.bind(this);

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(`TX executer: ${accounts[0]}`);

    let factory = await Factory.at(factoryAddress);

    // Change the ownership:
    let newAdmin = "0x1dec6F8151Bd3F379FeebFD04f796101957E9fFE";

    // add admin
    await factory.addAdmin(newAdmin, {from: accounts[0]}).catch(console.error);
    console.log(`Granted an admin role over Factory to ${newAdmin}`);

    // make him as minter and static user
    // Uncomment if you want to grant a permission.
    await grantPermission(factory, newAdmin);
    console.log("Got a permission")

    // renounce current user's admin role


    let amount = 1;
    let args = process.argv.slice(4);
    if (args.length == 1) {
	    amount = parseInt(args[0]);
	    if (amount < min || amount > max) {
	        throw "Number of minting NFTs should be between 1 and 5";
	    }
    }

    let owner = accounts[0];
    let generation = 2;
    let quality = 1;

    // Just to confirm
    console.log(`Mint ${amount} NFTs of Gen ${generation}, Quality ${quality} for ${owner}`)
    return;

    for (var i = 1; i <= amount; i++) {
        let res = await factory.mintQuality(owner, generation, quality, {from: accounts[0], gasPrice: gasPrice}).catch(console.error);
        console.log(`Mint ${i}/${amount}: Quality ${quality} minted!`);	
        console.log(`\tTxid: ${res.tx}\n`);
    }
};

