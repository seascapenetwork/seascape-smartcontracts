let Factory = artifacts.require("NftFactory");
let Nft = artifacts.require("SeascapeNft");

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
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");

    // global vars
    let user = accounts[1]; // should use factory deployer!
    let generation = 0;
    let amountToMint = 50;
    //let quality = 1;    // fixed quality


    // show current account
    console.log(`Using ${user}`);


    // mint nfts
    console.log(`attemping to mint ${amountToMint} nfts...`);
    for(let i=1; i<=amountToMint; i++){
        let quality = Math.floor(Math.random() * (6 - 1))+1;
        let minted = await factory.mintQuality(user, generation, quality);
        console.log(`Nft ${i} with quality ${quality} was minted`);
        // show progress
        if(i % 5 == 0){
          let percentComplete = Math.round(i/amountToMint*10000) / 100
          console.log(`Minting ${percentComplete}% complete.`);
        }
    }

    //fetch nft balance
    console.log("Checking users nft balance...");
    let balance = await nft.balanceOf(user);
    console.log(`User owns ${balance} nfts`);

}.bind(this);
