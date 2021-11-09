let Factory = artifacts.require("NftFactory");
let Nft = artifacts.require("SeascapeNft");

// rinkeby testnet
// let factoryAddress = '0x3eB88c3F2A719369320D731FbaE062b0f82F22e4';
// let nftAddress = '0x66638F4970C2ae63773946906922c07a583b6069';

// moonriver
let factoryAddress = "0x77478212aa57A7A9Cc5b611156Fce7c0697578fb";

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

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(`Minting account ${accounts[0]}`);

    let factory;
    let nft;

    factory = await Factory.at(factoryAddress);
    // nft = await Nft.at();

    console.log("Contracts initiated")

    // Uncomment the code line below to give permission to mint
    // await grantPermission(factory, accounts[0]);

    console.log("Set arguments")

    let owner = "0xAfD8B531CAD0393Fe4137634b0e71C1016CFe838";
    let generation = 2;
    let quality = 2;
    let amount = 1;

    for (var i = 0; i < amount; i++) {
        let res = await factory.mintQuality(owner, generation, quality, {from: accounts[0]}).catch(console.error);
        console.log("-------------------------");
        console.log(`NFT ${i}/${amount} of quality ${quality} was minted for ${owner}!`);	
        console.log(`Txid: ${res.tx}`);
        console.log();
    }
};

