let Factory = artifacts.require("NftFactory");
let Nft = artifacts.require("SeascapeNft");

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
    let accounts = await web3.eth.getAccounts();

    let factory = await Factory.at("0x3eB88c3F2A719369320D731FbaE062b0f82F22e4");
    let nft = await Nft.at("0x66638F4970C2ae63773946906922c07a583b6069");
    
    // if factory was set on nft, then no comment the two lines below.
    //let nftGranted = await nft.setFactory(factory.address);
    //console.log("Nft has been linked to factory: "+nftGranted.tx);

    /*let granted = await factory.isGenerator(accounts[0]);
    if (!granted) {
	    await grantPermission(factory, accounts[0]);
    } else {
	    console.log(`Account ${accounts[0]} was already granted a permission`);
    }*/

    let owner = "0xFEa7747216Ff0212Cb21ae35578c17B60428E376";//accounts[0];
    let generation = 0;
    let quality = 1;

    //let i = await nft.balanceOf(owner);
    //i++;
    //console.log(`Start from ${i}`);

    // later on the server, set the image id to clowns.

    for (i = 11; i<100; i++) {
        let res = await factory.mintQuality(owner, generation, quality);
        console.log("-------------------------");
        console.log(`Nft ${i} of quality ${quality} was minted!`);	
        console.log(`Txid: ${res.tx}`);
        console.log();
    }
};