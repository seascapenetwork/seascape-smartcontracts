let NftMarket = artifacts.require("NftMarket");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");


contract("Contract: Nft Market", async accounts => {


    //input for buy
    let index = 0;
    let currency //= crowns.address;

    //struct SalesObject
    let id = 0;
    let tokenId; // ?
    let startTime = 0;
    let durationTime; // ?
    let maxPrice = web3.utils.toWei("10", "ether");
    let minPrice = web3.utils.toWei("5", "ether");
    let finalPrice = web3.utils.toWei("10", "ether");
    let status = 0;
    let seller = null;
    let buyer = null;
    //already declared
    //let nft = null;

    //used by buy
    let _isStartUserSales = true;
    let _tipsFeeRate = 20;
    let _baseRate = 1000;

    //used by startSales
    let _salesAmount = 0;

    //used by crowns and other contracts
    let depositAmount = web3.utils.toWei("5", "ether");

    // following vars used in multiple test units:
    let nft = null;
    let factory = null;
    let nftMarket = null;
    let crowns = null;
    let player = null;
    let gameOwner = null;

    //--------------------------------------------------

    // before player starts, need to prepare a few things.
    // one of the things is to allow nft to be minted by nft factory
    it("should link nft, nft factory and nft market contracts", async () => {
	     factory = await Factory.deployed();
	     nftMarket = await NftMarket.deployed();
	     nft     = await Nft.deployed();
       crowns = await Crowns.deployed();

	     gameOwner = accounts[0];
       player = accounts[1];

	     await nft.setFactory(factory.address);
	     await factory.addGenerator(nftMarket.address, {from: gameOwner});
    });

    //--------------------------------------------------

    // before deposit of nft token,
    // player needs to approve the token to be transferred by nft rush contract
    it("should approve nft market to spend cws of player", async () => {

	    await crowns.approve(nftMarket.address, depositAmount, {from: player});

    	let allowance = await crowns.allowance(player, nftMarket.address);
    	assert.equal(allowance, depositAmount, "expected deposit sum to be allowed for nft rush");
    });

    

});
