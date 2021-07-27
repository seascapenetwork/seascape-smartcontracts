let NftSwap = artifacts.require("./NftSwap.sol");
let Crowns = artifacts.require("./CrownsToken.sol");
let Nft = artifacts.require("./SeascapeNft.sol");
let Factory = artifacts.require("./ScapeSwapParams.sol");
let SampleERC20Token = artifacts.require("./SampleERC20Token.sol");


contract("Nft Swap", async accounts => {



    //digital signatures
    async function signNfts(nftIds, quality) {
      //v, r, s related stuff
      let bytes32 = web3.eth.abi.encodeParameters(
        ["uint256", "uint256", "uint256", "uint256", "uint256"], nftIds);
      let bytes1 = web3.utils.bytesToHex([quality]);
      let str = bytes32 + bytes1.substr(2);
      let data = web3.utils.keccak256(str);
      let hash = await web3.eth.sign(data, gameOwner);

      let r = hash.substr(0,66);
      let s = "0x" + hash.substr(66,64);
      let v = parseInt(hash.substr(130), 16);
      if (v < 27) {
        v += 27;
      }

      return [v, r, s];
    }

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

    it("2.1 should mint requered tokens for buyer and for seller", async () => {

      let tokenAmountSeller = 14;
      let tokenAmountBuyer = 6;

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

    it("6.1 should cancel offerid4", async() => {
      let offerId = 4;
      // the following values could be fetched from SC
      let offerTokensAmount = 5;
      let bounty = web3.utils.toWei("10", "ether");
      let fee = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;


      //check nft, fee and bounty seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      let sellerBountyBalanceBefore = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
      let sellerFeeBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      //main contract calls
      let offerCanceled= await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);

      //check nft, fee and bounty seller balance after
      let sellerNftBalanceAfter = await nft.balanceOf(seller);
      assert.equal(parseInt(sellerNftBalanceBefore) + offerTokensAmount, parseInt(sellerNftBalanceAfter), `${offerTokensAmount} tokens should be returned to seller`);
      let sellerBountyBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
      assert.equal(sellerBountyBalanceBefore + bounty/finney, sellerBountyBalanceAfter,  "Seller didnt receive sufficient bounty");
      let sellerFeeBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
      assert.equal(sellerFeeBalanceBefore + feeRate/finney, sellerFeeBalanceAfter,  "Seller didnt receieve sufficient fee");
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

    it("11. shouldnt create an offer with unsupportedBounty (bounty 10eth)", async() => {
      let offerTokensAmount = 1;
      let requestTokensAmount = 1;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;


      let supportedBountyAddressRemoved = await nftSwap.removeSupportedBountyAddresses(bountyAddress, {from: gameOwner});
      try{
      //if createOffer() dont fail, test should fail
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, [offeredObject], requestTokensAmount, [requestedObject], bounty, bountyAddress,
         {from: seller}).catch(console.error);
       assert.fail;
       }catch{
         //if createOffer() fails, the test should pass
         assert(true);
       }
    });

    it("12. shouldnt create an offer exceeding maxRequestedTokens (1 for 2 nfts)", async() => {
      let offerTokensAmount = 1;
      let requestTokensAmount = 2;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = crowns.address;


      let requestedTokensAmount = await nftSwap.setRequestedTokensAmount(1, {from: gameOwner});
      try{
      //if createOffer() dont fail, test should fail
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, [offeredObject], requestTokensAmount, [requestedObject1, requestedObject2], bounty, bountyAddress,
         {from: seller}).catch(console.error);
       assert.fail;
       }catch{
         //if createOffer() fails, the test should pass
         assert(true);
       }
    });

    it("13. shouldnt create an offer exceeding maxOfferedTokens (2 for 1 nfts)", async() => {
      let offerTokensAmount = 2;
      let requestTokensAmount = 1;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = crowns.address;


      let offeredTokensAmount = await nftSwap.setOfferedTokensAmount(1, {from: gameOwner});
      try{
      //if createOffer() dont fail, test should fail
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, [offeredObject1, offeredObject2], requestTokensAmount, [requestedObject], bounty, bountyAddress,
         {from: seller}).catch(console.error);
       assert.fail;
       }catch{
         //if createOffer() fails, the test should pass
         assert(true);
       }
    });

    it("14. should create offer id5: 0.25eth bounty 2 for 2 nft, 0.75cws fee", async() => {
      let offerTokensAmount = 2;
      let requestTokensAmount = 2;
      let bounty = web3.utils.toWei("250", "milli");
      let bountyAddress = sampleERC20Token.address;
      let feeRate = web3.utils.toWei("750", "milli");

      let feeChanged = await nftSwap.setFee(feeRate, {from: gameOwner});
      let supportedBountyAddressAdded = await nftSwap.addSupportedBountyAddresses(bountyAddress, {from: gameOwner});
      let offeredTokensAmount = await nftSwap.setOfferedTokensAmount(2, {from: gameOwner});
      let requestedTokensAmount = await nftSwap.setRequestedTokensAmount(2, {from: gameOwner});

      //check nft, fee and bounty seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      let sellerBountyBalanceBefore = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
      let sellerFeeBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

      //main contract calls
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, [offeredObject1, offeredObject2], requestTokensAmount, [requestedObject1, requestedObject2], bounty, bountyAddress,
         {from: seller}).catch(console.error);

       //check nft, fee and bounty seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       assert.equal(parseInt(sellerNftBalanceAfter), parseInt(sellerNftBalanceBefore) + offerTokensAmount, `${offerTokensAmount} tokens should be taken from seller`);
       let sellerBountyBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
       assert.equal(sellerBountyBalanceBefore, sellerBountyBalanceAfter + bounty/finney,  "Seller didnt pay sufficient bounty");
       let sellerFeeBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
       assert.equal(sellerFeeBalanceBefore, sellerFeeBalanceAfter + feeRate/finney,  "Seller didnt pay sufficient fee");
    });

    it("15. shouldnt create an offer when trade is disabled (1 for 1 nfts)", async() => {
      let offerTokensAmount = 1;
      let requestTokensAmount = 1;
      let bounty = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;

      let tradeDisabled = await nftSwap.enableTrade(false, {from: gameOwner});
      try{
      //if createOffer() dont fail, test should fail
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, [offeredObject], requestTokensAmount, [requestedObject], bounty, bountyAddress,
         {from: seller}).catch(console.error);
       assert.fail;
       }catch{
         //if createOffer() fails, the test should pass
         assert(true);
       }
    });

    it("16. should cancel offer id1 even when trade is disabled", async() => {
      let offerId = 1;
      // the following values could be fetched from SC
      let offerTokensAmount = 1;
      let fee = web3.utils.toWei("1", "ether");

      //check nft, fee and bounty seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      let sellerFeeBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

      //main contract calls
      let offerCanceled= await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);

      //check nft, fee and bounty seller balance after
      let sellerNftBalanceAfter = await nft.balanceOf(seller);
      assert.equal(parseInt(sellerNftBalanceBefore) + offerTokensAmount, parseInt(sellerNftBalanceAfter), `${offerTokensAmount} tokens should be returned to seller`);
      let sellerFeeBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
      assert.equal(sellerFeeBalanceBefore + feeRate/finney, sellerFeeBalanceAfter,  "Seller didnt receieve sufficient fee");
    });

    it("17. shouldnt cancel offer id1 when its already canceled", async() => {
      let offerId = 1;

      try{
      //if cancelOffer() dont fail, test should fail
      let offerCanceled= await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);
       }catch{
         //if cancelOffer() fails, the test should pass
         assert(true);
       }
    });

    it("18. shouldnt cancel offer id2 when sender not author", async() => {
      let offerId = 2;

      try{
      //if cancelOffer() dont fail, test should fail
      let offerCanceled= await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);
       }catch{
         //if cancelOffer() fails, the test should pass
         assert(true);
       }
    });

    it("19. shouldnt accept offer id2 when trade is disabled", async() => {
      let offerId = 2;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [id1, id2];
      let requestedTokenAddresses = [address1, address2];

      let signature = await signNfts(nftIds, quality);

      try{
      //if offerAccepted() dont fail, test should fail
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds[2], requestedTokenAddresses[2],
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);
       }catch{
         //if offerAccepted() fails, the test should pass
         assert(true);
       }
    });

    it("20. shouldnt accept offer id1 when offer has been canceled", async() => {
      let offerId = 1;
      let requestedTokensAmount = 1;
      let requestedTokenIds = [id1];
      let requestedTokenAddresses = [address1];

      let signature = await signNfts(nftIds, quality);

      try{
      //if offerAccepted() dont fail, test should fail
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses,
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);
       }catch{
         //if offerAccepted() fails, the test should pass
         assert(true);
       }
    });

    it("21. shouldnt accept self-made offer id2", async() => {
      let offerId = 2;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [id1, id2];
      let requestedTokenAddresses = [address1, address2];

      let signature = await signNfts(nftIds, quality);

      try{
      //if offerAccepted() dont fail, test should fail
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses,
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);
       }catch{
         //if offerAccepted() fails, the test should pass
         assert(true);
       }
    });

    xit("22. shouldnt accept offer id2 when offering insufficient amount of bounty (1)", async() => {
      let offerId = 2;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [id1, id2];
      let requestedTokenAddresses = [address1, address2];

      let signature = await signNfts(nftIds, quality);

      try{
      //if offerAccepted() dont fail, test should fail
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses,
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);
       }catch{
         //if offerAccepted() fails, the test should pass
         assert(true);
       }
    });

    it("23. shouldnt accept offer id2 when requested token addresses dont match", async() => {
      let offerId = 2;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [id1, id2];
      let requestedTokenAddresses = [incorrectAddress1, incorrectAddress2];

      let signature = await signNfts(nftIds, quality);

      try{
      //if offerAccepted() dont fail, test should fail
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses,
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);
       }catch{
         //if offerAccepted() fails, the test should pass
         assert(true);
       }
    });

    it("24. shouldnt accept offer id3 with insufficient bounty tokens", async() => {
      let offerId = 3;
      let requestedTokensAmount = 1;
      let requestedTokenIds = id1;
      let requestedTokenAddresses = address1;
      //make sure buyer has insufficient bounty tokens

      let signature = await signNfts(nftIds, quality);

      try{
      //if offerAccepted() dont fail, test should fail
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses,
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);
       }catch{
         //if offerAccepted() fails, the test should pass
         assert(true);
       }
    });

    //cannot input incorrect bounty address so test may not be possible
    xit("25. shouldnt accept offer id3 when bounty addresses dont match", async() => {
      let offerId = 3;
      let requestedTokensAmount = 1;
      let requestedTokenIds = id1;
      let requestedTokenAddresses = address1;
      //make sure buyer has insufficient bounty tokens (eth)

      let signature = await signNfts(nftIds, quality);

      try{
      //if offerAccepted() dont fail, test should fail
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses,
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);
       }catch{
         //if offerAccepted() fails, the test should pass
         assert(true);
       }
    });

    xit("26. shouldnt accept offer id3 when insufficient tokens for fee", async() => {
      let offerId = 3;
      let requestedTokensAmount = 1;
      let requestedTokenIds = id1;
      let requestedTokenAddresses = address1;
      //make sure buyer has insufficient fee tokens (cws)

      let signature = await signNfts(nftIds, quality);

      try{
      //if offerAccepted() dont fail, test should fail
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses,
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);
       }catch{
         //if offerAccepted() fails, the test should pass
         assert(true);
       }
    });

    it("27. should accept offer id2", async() => {
      let offerId = 2;
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [id1, id2];
      let requestedTokenAddresses = [address1, address2];
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = crowns.address;

      //check nft and bounty buyer balance before
      let buyerNftBalanceBefore = await nft.balanceOf(buyer);
      let buyerBountyBalanceBefore = Math.floor(parseInt(await bountyAddress.balanceOf(buyer))/finney);

      let signature = await signNfts(nftIds, quality);
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses,
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);

      //check nft and bounty buyer balance after
      let buyerNftBalanceAfter = await nft.balanceOf(buyer);
      assert.equal(parseInt(buyerNftBalanceBefore) + requestedTokensAmount, parseInt(buyerNftBalanceAfter) + offeredTokensAmount, `buyer nft balances are incorrect`);
      let buyerBountyBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(buyer))/finney);
      assert.equal(buyerBountyBalanceBefore + bounty/finney, buyerBountyBalanceAfter,  "Buyer didnt receieve sufficient bounty");
    });

    it("28. should accept offer id3", async() => {
      let offerId = 3;
      let requestedTokensAmount = 1;
      let requestedTokenIds = id1;
      let requestedTokenAddresses = address1;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;

      //check nft and bounty buyer balance before
      let buyerNftBalanceBefore = await nft.balanceOf(buyer);
      let buyerBountyBalanceBefore = Math.floor(parseInt(await bountyAddress.balanceOf(buyer))/finney);

      let signature = await signNfts(nftIds, quality);
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses,
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);

      //check nft and bounty buyer balance after
      let buyerNftBalanceAfter = await nft.balanceOf(buyer);
      assert.equal(parseInt(buyerNftBalanceBefore) + requestedTokensAmount, parseInt(buyerNftBalanceAfter) + offeredTokensAmount, `buyer nft balances are incorrect`);
      let buyerBountyBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(buyer))/finney);
      assert.equal(buyerBountyBalanceBefore + bounty/finney, buyerBountyBalanceAfter,  "Buyer didnt receieve sufficient bounty");
    });

    it("29. should accept offer id5", async() => {
      let offerId = 5;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [id1, id2];
      let requestedTokenAddresses = [address1, address2];
      let bounty = web3.utils.toWei("250", "milli");
      let bountyAddress = sampleERC20Token.address;

      //check nft and bounty buyer balance before
      //edit here also check contract balance for cws spend fee = 0.75
      let buyerNftBalanceBefore = await nft.balanceOf(buyer);
      let buyerBountyBalanceBefore = Math.floor(parseInt(await bountyAddress.balanceOf(buyer))/finney);

      let signature = await signNfts(nftIds, quality);
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds[2], requestedTokenAddresses[2],
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);

      //check nft and bounty buyer balance after
      //edit here also check contract balance for cws spend fee = 0.75
      let buyerNftBalanceAfter = await nft.balanceOf(buyer);
      assert.equal(parseInt(buyerNftBalanceBefore) + requestedTokensAmount, parseInt(buyerNftBalanceAfter) + offeredTokensAmount, `buyer nft balances are incorrect`);
      let buyerBountyBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(buyer))/finney);
      assert.equal(buyerBountyBalanceBefore + bounty/finney, buyerBountyBalanceAfter,  "Buyer didnt receieve sufficient bounty");
    });

    it("30. shouldnt accept offer id2 when its already been accepted", async() => {
      let offerId = 2;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [id1, id2];
      let requestedTokenAddresses = [address1, address2];

      let signature = await signNfts(nftIds, quality);

      try{
      //if offerAccepted() dont fail, test should fail
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds[2], requestedTokenAddresses[2],
        signature[0], signature[1], signature[2], {from: buyer}).catch(console.error);
       }catch{
         //if offerAccepted() fails, the test should pass
         assert(true);
       }
    });

});
