let Factory = artifacts.require("NftFactory");
let Nft = artifacts.require("SeascapeNft");

module.exports = async function(callback) {
    let res = init();

    callback(null, res);
};

let init = async function() {
    let accounts = await web3.eth.getAccounts();

    let nft = await Nft.at("0x607cBd90BE76e9602548Fbe63931AbE9E8af8aA7");
    let factory = await Factory.at("0x77478212aa57A7A9Cc5b611156Fce7c0697578fb");

    let balance = await nft.balanceOf(accounts[0]);
    console.log(`NFT Balance: ${balance}`);

    let isAdmin = await factory.isAdmin(accounts[0]);
    console.log(`${accounts[0]} is admin of factory: ${isAdmin}`);

    let generator = '0xCE168875054B12Bed85d015AB3A71983E6dAc86E';
    await factory.addGenerator(generator, {gasPrice: 20000000000}).catch(console.error);
    console.log(`${generator} got permission to mint nfts`);
};