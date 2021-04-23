let NftMarket = artifacts.require("./NftMarket.sol");
let Crowns = artifacts.require("./CrownsToken.sol");
let Nft = artifacts.require("./SeascapeNft.sol");
let Factory = artifacts.require("./NftFactory.sol");


contract("Nft Market", async accounts => {


    //input for buy
    let index = 0;

    //struct SalesObject
    let id = 0;
    let tokenId = 1; // aka nftId
    let startTime;  //declared inside tests
    let price = web3.utils.toWei("2", "ether");
    let status = 0;

    //used by buy
    let _isStartUserSales = true;
    let _tipsFeeRate = 100;

    //used by startSales
    let _salesAmount = 0;

    //used by crowns and other contracts
    let depositAmount = web3.utils.toWei("5", "ether");

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


    //--------------------------------------------------

    // before seller starts, need to prepare a few things.
    // one of the things is to allow nft to be minted by nft factory
    it("should link nft, nft factory and nft market contracts", async () => {
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

    //--------------------------------------------------

    // before deposit of nft token,
    // seller needs to approve the token to be transferred by nft rush contract
    it("should approve nft market to spend cws of seller", async () => {

	    await crowns.approve(nftMarket.address, depositAmount, {from: seller});

    	let allowance = await crowns.allowance(seller, nftMarket.address);
    	assert.equal(allowance, depositAmount, "expected deposit sum to be allowed for nft rush");

    });

    it("should mint 5 nft tokens", async () => {
      //check nft user balance before
      let balanceBefore = await nft.balanceOf(seller);

      //mint.js
      web3.eth.getAccounts(function(err,res) {accounts = res;});
      let granted = await factory.isGenerator(accounts[0]);
      if (!granted) {
          let res = await factory.addGenerator(accounts[0]);
      } else {
        //replace with throw errror
         console.log(`Account ${accounts[0]} was already granted a permission`);
      }

      let generation = 0;
      let quality = 1;
      //mint 2 tokens of each quality
      for(var i = 0; i < 5; i++){
        await factory.mintQuality(seller, generation, quality + i);
      }

      //check nft user balance after
      let balanceAfter = await nft.balanceOf(seller);
      assert.equal(parseInt(balanceAfter), parseInt(balanceBefore)+5, "5 Nft tokens should be minted");
    });

    it("should put nft for sale", async() => {

      //check nft user balance before
      let balanceBefore = await nft.balanceOf(seller);

      startTime = Math.floor(Date.now()/1000) + 3;

      //ERC721 approve and deposit token to contract
      await nft.setApprovalForAll(nftMarket.address, true, {from: seller});

      await nftMarket.setIsStartUserSales(true);

      await nftMarket.startSales(tokenId, price, startTime, crowns.address, {from: seller});

      //check nft user balance after
      let balanceAfter = await nft.balanceOf(seller);
      assert.equal(parseInt(balanceBefore), parseInt(balanceAfter)+1, "5 Nft tokens should be minted");
    });

    it("should approve nft market to spend cws of buyer", async () => {

       let crownsDeposit = web3.utils.toWei("5", "ether");

       //get some Crowns
       await crowns.transfer(buyer, crownsDeposit, {from: gameOwner});

       //approve spending of crowns
	     await crowns.approve(nftMarket.address, crownsDeposit, {from: buyer});
	     let allowance = await crowns.allowance(buyer, nftMarket.address);
	     assert.equal(parseInt(allowance), parseInt(depositAmount), "expected deposit sum to be allowed for nft rush");
    });


    it("should buy nft", async() => {
      //check nft and cws buyer balance before
      let buyerNftBalanceBefore = await nft.balanceOf(buyer);
      let buyerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(buyer))/finney);
      //and feeReciever
      feeReciever = accounts[3];
      let feeRecieverBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(feeReciever))/finney);
      //check cws seller balance before
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

      //execute buy
      await nftMarket.buy(tokenId, crowns.address, {from: buyer});

      //check buyers nft balance after
      let buyerNftBalanceAfter = await nft.balanceOf(buyer);
      assert.equal(parseInt(buyerNftBalanceBefore)+1, parseInt(buyerNftBalanceAfter), "Buyer did not recieve nft");

      //check buyers cws balance after
      let fee = (price/finney) * _tipsFeeRate/1000;
      let buyerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(buyer))/finney);
      assert.equal(buyerCwsBalanceBefore, buyerCwsBalanceAfter+price/finney, "Buyer didnt pay sufficient price");

      //check that feeReciever gets the fees
      let feeRecieverBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(feeReciever))/finney);
      assert.equal(feeRecieverBalanceBefore + fee, feeRecieverBalanceAfter, "feeReciever did not recieve fees");

      //check cws seller balance after
      let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      //following assertion may fails due to no accounting transaction fees
      assert.equal(sellerCwsBalanceBefore+price/finney-fee, sellerCwsBalanceAfter, "Seller didnt recieve enough money");
    });



});
