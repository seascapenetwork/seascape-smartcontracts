let Factory = artifacts.require("NftFactory");

// rinkeby testnet
let factoryAddress = '0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0';

module.exports = async function(callback) {
    let res = init();

    callback(null, res);
};

let grantPermission = async function(factory, address) {
    let res = await factory.addGenerator(address);
    console.log(res);
    console.log(`Account ${address} granted a GENERATOR permission in Nft Factory`);
    return res;
}.bind(this);

let init = async function() {
    web3.eth.getAccounts(function(err,res) {accounts = res;});

    let factory = null;
    const networkId = await web3.eth.net.getId();
    
    if (networkId == 4) {
	factory = await Factory.at(factoryAddress);	
    } else {
	factory = await Factory.deployed();
    }    
    console.log("Nft factory: "+factory.address);

    let granted = await factory.isGenerator(accounts[0]);
    if (!granted) {
	await grantPermission(factory, accounts[0]);
    } else {
	console.log(`Account ${accounts[0]} was already granted a permission`);
    }

    let owner = accounts[0];
    let generation = 0;
    let quality = 1;

    let quality1 = await factory.mintQuality(owner, generation, quality);
    console.log("Quality 1 was minted");
    console.log(quality1);
    
    let quality2 = await factory.mintQuality(owner, generation, quality + 1);
    console.log("Quality 2 was minted");
    console.log(quality2);
    
    let quality3 = await factory.mintQuality(owner, generation, quality + 2);
    console.log("Quality 3 was minted");
    console.log(quality3);
    
    let quality4 = await factory.mintQuality(owner, generation, quality + 3);
    console.log("Quality 4 was minted");
    console.log(quality4);
    
    let quality5 = await factory.mintQuality(owner, generation, quality + 4);
    console.log("Quality 5 was minted");    
    console.log(quality5);
};

