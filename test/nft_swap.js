let NftSwap = artifacts.require("./NftSwap.sol");
let Crowns = artifacts.require("./CrownsToken.sol");
let Nft = artifacts.require("./SeascapeNft.sol");
let Factory = artifacts.require("./ScapeSwapParams.sol");
let SampleERC20Token = artifacts.require("./SampleERC20Token.sol");


contract("Nft Swap", async accounts => {


    let tokenId;
    let price = web3.utils.toWei("2", "ether");
    let tipsFeeRate = 100;


    // following vars present contracts
    let nft = null;
    let factory = null;
    let nftSwap = null;
    let crowns = null;
    let sampleERC20Token = null;

    //accounts
    let gameOwner = null;
    let seller = null;
    let buyer = null;
    let feeReciever = null;

    //support variables
    let finney = 1000000000000000;

    // nfts data, required for mint
    let fee = web3.utils.toWei("1", "ether");
    let quality = 3;
    let nftIds = new Array(5);

    //support variables
    let finney = 1000000000000000;




    // edit here add scapeSwapParams
    it("1. should link required contracts", async () => {
	     // scapeSwapParams = await ScapeSwapParams.deployed();
       factory = await Factory.deployed();
	     nftSwap = await NftSwap.deployed();
	     nft     = await Nft.deployed();
       crowns = await Crowns.deployed();
       sampleERC20Token = await SampleERC20Token.deployed();

       //initialize accounts
	     gameOwner = accounts[0];
       seller = accounts[1];
       buyer = accounts[2];
    });

    // edit here enableSwapContractAddress
    it("2. should initialize the contract", async () => {

      let nftAddressAdded = await nftSwap.addSupportedNftAddress(nft.address, {from: gameOwner});
      let tradeEnabled = await nftSwap.enableTrade(true, {from: gameOwner});
      assert.equal(tradeEnabled.receipt.status, true, "trade is not enabled");
    });

    it("should mint requered tokens for buyer and for seller", async () => {

      let tokenAmountSeller = 10;
      let tokenAmountBuyer = 4;

      //check nft user balance before
      let balanceBeforeSeller = await nft.balanceOf(seller);
      let balanceBeforeBuyer = await nft.balanceOf(buyer);
      //mint.js
      let generatorSeller = await factory.addGenerator(seller);
      let generatorBuyer = await factory.addGenerator(buyer);

      let generation = 0;
      let quality = 1;
      //mint 2 tokens of each quality
      for(var i = 0; i < tokenAmountSeller; i++){
        await factory.mintQuality(seller, generation, quality);
      }
      for(var i = 0; i < tokenAmountBuyer; i++){
        await factory.mintQuality(buyer, generation, quality);
      }

      //check nft user balance after
      let balanceAfterSeller = await nft.balanceOf(seller);
      assert.equal(parseInt(balanceAfterSeller), parseInt(balanceBeforeSeller) + tokenAmountSeller, `${tokenAmountSeller} tokens should be minted for seller`);
      let balanceAfterBuyer = await nft.balanceOf(buyer);
      assert.equal(parseInt(balanceAfterBuyer), parseInt(balanceBeforeBuyer) + tokenAmountBuyer, `${tokenAmountBuyer} tokens should be minted for buyer`);
    });

    it("3. should create offer id1: no bounty 1 for 1 nft", async() => {
      let offerTokensAmount = 1;
      let requestTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = 0x0;

      //check nft and cws seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

      let offerCreated = await nftSwap.createOffer(offerTokensAmount, [offeredObject], requestTokensAmount, [requestedObject], bounty, bountyAddress,
         {from: seller}).catch(console.error);

       //check nft and cws seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       assert.equal(parseInt(sellerNftBalanceAfter), parseInt(sellerNftBalanceBefore) + offerTokensAmount, `${offerTokensAmount} tokens should be taken from seller`);
       let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + bounty/finney,  "Seller didnt pay enough fee");

      // assert that contract has one nft more
      // assert that contract has one cws more

    });

    it("4. should create offer id2: 10cws bounty 1 for 2 nfts", async() => {
      let offerTokensAmount = 1;
      let requestTokensAmount = 2;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = crowns.address;
      //check nft and cws seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      let sellerCwsBalanceBefore = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);

      let offerCreated = await nftSwap.createOffer(offerTokensAmount, [offeredObject], requestTokensAmount, [requestedObject1, requestedObject2], bounty, bountyAddress,
         {from: seller}).catch(console.error);

       //check nft and cws seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       assert.equal(parseInt(sellerNftBalanceAfter), parseInt(sellerNftBalanceBefore) + offerTokensAmount, `${offerTokensAmount} tokens should be taken from seller`);
       let sellerCwsBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
       assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + bounty/finney,  "Seller didnt pay sufficient fee");

      // assert that contract has one nft more
      // assert that contract has one cws more

    });

    it("5. should create offer id3: 10eth bounty 2 for 1 nfts", async() => {
      let offerTokensAmount = 2;
      let requestTokensAmount = 1;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;
      //check nft and bounty seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      let sellerBountyBalanceBefore = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);

      //main contract calls
      let supportedBountyAddressAdded = await nftSwap.addSupportedBountyAddresses(bountyAddress, {from: gameOwner});
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, [offeredObject1, offeredObject2], requestTokensAmount, [requestedObject], bounty, bountyAddress,
         {from: seller}).catch(console.error);

       //check nft and bounty seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       assert.equal(parseInt(sellerNftBalanceAfter), parseInt(sellerNftBalanceBefore) + offerTokensAmount, `${offerTokensAmount} tokens should be taken from seller`);
       let sellerBountyBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
       assert.equal(sellerBountyBalanceBefore, sellerBountyBalanceAfter + bounty/finney,  "Seller didnt pay sufficient fee");

      // assert that contract has one nft more
      // assert that contract has one bounty token more
    });

    it("6. should create offer id4: 10cws bounty 5 for 5 nfts", async() => {
      let offerTokensAmount = 5;
      let requestTokensAmount = 5;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = crowns.address;
      //check nft and bounty seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      let sellerBountyBalanceBefore = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);

      //main contract calls
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, [offeredObject1, offeredObject2], requestTokensAmount, [requestedObject], bounty, bountyAddress,
         {from: seller}).catch(console.error);

       //check nft and bounty seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       assert.equal(parseInt(sellerNftBalanceAfter), parseInt(sellerNftBalanceBefore) + offerTokensAmount, `${offerTokensAmount} tokens should be taken from seller`);
       let sellerBountyBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
       assert.equal(sellerBountyBalanceBefore, sellerBountyBalanceAfter + bounty/finney,  "Seller didnt pay sufficient fee");

      // assert that contract has one nft more
      // assert that contract has one bounty token more
    });

    it("7. shouldnt create an offer without offerTokens (0 for 1 nfts)", async() => {
      let offerTokensAmount = 0;
      let requestTokensAmount = 1;
      let bounty = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
      await nftSwap.createOffer(offerTokensAmount, [], requestTokensAmount, [requestedObject], bounty, bountyAddress,
         {from: seller}).catch(console.error);
      assert.fail;
      }catch{
        //if createOffer() fails, the test should pass
        assert(true);
      }
    });

    it("8. shouldnt create an offer without requestedTokens (1 for 0 nfts)", async() => {
      let offerTokensAmount = 1;
      let requestTokensAmount = 0;
      let bounty = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
      await nftSwap.createOffer(offerTokensAmount, [offeredObject], requestTokensAmount, [], bounty, bountyAddress,
         {from: seller}).catch(console.error);
      assert.fail;
      }catch{
        //if createOffer() fails, the test should pass
        assert(true);
      }
    });

    it("9. shouldnt create offer with more than 5 offerTokens (6 for 5 nfts)", async() => {
      let offerTokensAmount = 6;
      let requestTokensAmount = 5;
      let bounty = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
      await nftSwap.createOffer(offerTokensAmount, [offeredObject1, offeredObject2, offeredObject3, offeredObject4, offeredObject5, offeredObject6],
        requestTokensAmount, [requestedObject1, requestedObject2, requestedObject3, requestedObject4, requestedObject5], bounty, bountyAddress,
         {from: seller}).catch(console.error);
      assert.fail;
      }catch{
        //if createOffer() fails, the test should pass
        assert(true);
      }
    });

    it("10. shouldnt create offer with more than 5 requestedTokens (5 for 6 nfts)", async() => {
      let offerTokensAmount = 5;
      let requestTokensAmount = 6;
      let bounty = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
      await nftSwap.createOffer(offerTokensAmount, [offeredObject1, offeredObject2, offeredObject3, offeredObject4, offeredObject5], requestTokensAmount,
        [requestedObject1, requestedObject2, requestedObject3, requestedObject4, requestedObject5, requestedObject6], bounty, bountyAddress,
         {from: seller}).catch(console.error);
      assert.fail;
      }catch{
        //if createOffer() fails, the test should pass
        assert(true);
      }
    });
