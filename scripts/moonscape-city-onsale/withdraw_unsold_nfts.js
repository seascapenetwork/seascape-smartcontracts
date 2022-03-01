let CityNftSale = artifacts.require("CityNftSale");
let CityNft = artifacts.require("CityNft");


// global variables
let accounts;
let multiplier = 1000000000000000000;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {

    //--------------------------------------------------
    // Accounts and contracts configuration
    //--------------------------------------------------

    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let cityNftSale = await CityNftSale.at("0x9326FfC875B32677132184E68BCCC6fd75c79d51");
    let cityNft     = await CityNft.at("0xB5d814C5E4d772883bf9C7baB80C718820E15989");


    let owner = accounts[0];
    console.log(`Using account ${owner}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    // let sessionId = parseInt(await cityNftSale.sessionId.call());
    // sessionId = console.log(`last session id: ${sessionId}`);
    let receiverAddress = "0x983D3460Fc959ee933EdCd766CfefC9cF9aFc637";

    let sessionId = 1;

    // contract calls
    // await approveUnsoldNfts();
    await withdrawNfts();

    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // approve withdrawal of unsold nfts - after session end
    async function approveUnsoldNfts(){
      console.log("Checking if Nfts are approved ?")
      let approved = await cityNft.isApprovedForAll(cityNftSale.address, receiverAddress);
      console.log(approved);
      if(!approved){
        console.log("attempting to approve unsold nfts...");
        await cityNftSale.approveUnsoldNfts(sessionId, receiverAddress, {from: owner});
        console.log("unsold nfts were approved");
      }
    }

    async function withdrawNfts(){
      while(true){
        let tokenId = await cityNft.tokenOfOwnerByIndex(cityNftSale.address, 0).catch(console.error);
        tokenId = parseInt(tokenId);
        if(tokenId == NaN){
          console.log("no more nfts in the contract");
          break;
        }

        console.log(`attempting to withdraw nft id ${tokenId}...`);
        await cityNft.safeTransferFrom(cityNftSale.address, receiverAddress, tokenId, {from: owner});
        console.log(`${tokenId} was transfered`);
      }
    }



}.bind(this);
