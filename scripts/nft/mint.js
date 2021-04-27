let Factory = artifacts.require("NftFactory");
let Nft = artifacts.require("SeascapeNft");

// rinkeby testnet
let factoryAddress = '0x3eB88c3F2A719369320D731FbaE062b0f82F22e4';
let nftAddress = '0x66638F4970C2ae63773946906922c07a583b6069';

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
    console.log(`Account ${address} granted a GENERATOR permission in Nft Factory`);
    return res;
}.bind(this);

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let factory;
    let nft;

        factory = await Factory.deployed();
        nft = await Nft.deployed();

    console.log("Contracts initiated")

    await grantPermission(factory, accounts[0]);

    console.log("Got a permission")

    let amount = 5;
    let args = process.argv.slice(4);
    if (args.length == 1) {
	    amount = parseInt(args[0]);
	    if (amount < min || amount > max) {
	        throw "Number of minting NFTs should be between 1 and 5";
	    }
    }
    

    console.log("Set arguments")

    let owner = accounts[0];
    let generation = 0;

    for (var quality = 1; quality <= amount; quality++) {
        let res = await factory.mintQuality(owner, generation, 4, {from: accounts[0], gasPrice: 136000000000});
        console.log("-------------------------");
        console.log(`Quality ${4} was minted!`);	
        console.log(`Txid: ${res.tx}`);
        console.log();
    }
};

