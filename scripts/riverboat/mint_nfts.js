let Factory = artifacts.require("RiverboatFactory");
let Nft = artifacts.require("RiverboatNft");

let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};


let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    // contracts
    let factory  = await Factory.at("0x693B804c37318eD5972840D10CDAe8Fbea8145f7");
    let nft     = await Nft.at("0x115Aa9E35564307365Ca3f215f67eB69886f2fD1");

    // global vars
    let user = accounts[0];//"0x5434BDc9de2005278532F9041cBf3C939E48C4DC"; // should use factory deployer!
    let type = 0;
    let amountToMint = 20;


    // show current account
    console.log(`Using ${user}`);

    // mint nfts
    console.log(`attemping to mint ${amountToMint} nfts...`);
    for(let i=1; i<=amountToMint; i++){
        let minted = await factory.mintType(user, type);
        console.log(`Nft ${i} with type ${type} was minted`);
        // show progress
        if(i % 5 == 0){
          let percentComplete = Math.round(i/amountToMint*10000) / 100;
          console.log(`Minting ${percentComplete}% complete.`);
        }
    }

    // fetch nft balance
    console.log("Checking users nft balance...");
    balance = await nft.balanceOf(user);
    console.log(`User owns ${balance} nfts`);

}.bind(this);
