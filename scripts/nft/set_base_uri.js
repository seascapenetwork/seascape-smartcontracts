let Nft = artifacts.require("SeascapeNft");

let accounts;
//let uri = "https://api-test.blocklords.io:81/nft/metadata/";
let uri = "https://api.seascape.network/nft/metadata/";

module.exports = async function(callback) {
    let res = init();

    callback(null, res);
};

let init = async function() {
    web3.eth.getAccounts(function(err,res) {accounts = res;});

    let nft = await Nft.deployed();
    console.log("Nft to use: "+nft.address);

    // should set the base uri
    let res = await nft.setBaseUri(uri);
    console.log("base uri was set "+uri);
    
    let tokenURI = await nft.tokenURI(1);
    console.log("Token uri: "+tokenURI);
}
