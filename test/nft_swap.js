let NftMarket = artifacts.require("./NftSwap.sol");
let Crowns = artifacts.require("./CrownsToken.sol");
let Nft = artifacts.require("./SeascapeNft.sol");
let Factory = artifacts.require("./ScapeSwapParams.sol");


contract("Nft Swap", async accounts => {


    let tokenId;
    let price = web3.utils.toWei("2", "ether");
    let tipsFeeRate = 100;


    // following vars present contracts
    let nft = null;
    let factory = null;
    let nftMarket = null;
    let crowns = null;

    //accounts
    let gameOwner = null;
    let seller = null;
    let buyer = null;
    let feeReciever = null;

    //support variables
    let finney = 1000000000000000;




    // before seller starts, need to prepare a few things.
    // one of the things is to allow nft to be minted by nft factory
    it("should linkcrowns, nft and nftSwap contracts", async () => {
	     factory = await Factory.deployed();
	     nftMarket = await NftMarket.deployed();
	     nft     = await Nft.deployed();
       crowns = await Crowns.deployed();

       //initialize accounts
	     gameOwner = accounts[0];
       seller = accounts[1];
       buyer = accounts[2];

	     await nft.setFactory(factory.address);
	     await factory.addGenerator(nftMarket.address, {from: gameOwner});
    });
