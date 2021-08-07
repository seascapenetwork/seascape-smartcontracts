let NftSwap = artifacts.require("./NftSwap.sol");
let ScapeSwapParams = artifacts.require("./ScapeSwapParams.sol")
let Crowns = artifacts.require("./CrownsToken.sol");
let Nft = artifacts.require("./SeascapeNft.sol");
let Factory = artifacts.require("./NftFactory.sol");
let SampleERC20Token = artifacts.require("./SampleERC20Token.sol");


contract("Nft Swap", async accounts => {

    async function signParams(bytes){

      let data = web3.utils.keccak256(bytes);
      let hash = await web3.eth.sign(data, gameOwner);

      let r = hash.substr(0,66);
      let s = "0x" + hash.substr(66,64);
      let v = parseInt(hash.substr(130), 16);
      if (v < 27) {
          v += 27;
      }

      return [v, r, s];
    }

    //digital signatures
    function encodeNft(_offerId, _imgId, _gen, _quality) {
      //generating v r s for 4 parameters
      let bytes32 = web3.eth.abi.encodeParameters(
        ["uint256", "uint256", "uint256"], [_offerId, _imgId, _gen]);

      let bytes1 = web3.utils.bytesToHex([_quality]);

      let str = bytes32 + bytes1.substr(2);

      return str;
    }


    let price = web3.utils.toWei("2", "ether");
    let tipsFeeRate = 100;
    let offersAmount = 0;

    // following vars present contracts
    let nft = null;
    let factory = null;
    let scapeSwapParams = null;
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

    // nfts data, required for offers
    let fee = web3.utils.toWei("1", "ether");
    let nftIdCount = 1;
    let requestedTokensArray = [                          // this array must contain sample data for empty slots
      // structure: [nftAddress,imgId, ]
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
    ];




    // edit here add scapeSwapParams
    it("1. should link required contracts", async () => {
	     // scapeSwapParams = await ScapeSwapParams.deployed();
       factory = await Factory.deployed();
	     nftSwap = await NftSwap.deployed();
       scapeSwapParams =  await ScapeSwapParams.deployed();
	     nft     = await Nft.deployed();
       crowns = await Crowns.deployed();
       sampleERC20Token = await SampleERC20Token.deployed();
       //sampleERC20Token = await SampleERC20Token.deployed();

       //initialize accounts
	     gameOwner = accounts[0];
       seller = accounts[1];
       buyer = accounts[2];

      await nft.setFactory(factory.address);
      await factory.addGenerator(nftSwap.address, {from: gameOwner});
    });

    // edit here enableSwapContractAddress
    it("2. should initialize the contract", async () => {

      let nftAddressAdded = await nftSwap.enableSupportedNftAddress(nft.address, scapeSwapParams.address, {from: gameOwner})
        .catch(console.error);
      let tradeEnabled = await nftSwap.enableTrade(true, {from: gameOwner});

      // verify swapParams address added to mappping
      // assert.equal(nftSwap.supportedNftAddresses[nft.address], scapeSwapParams.address
      //   ,"swap params address not added");
      assert.equal(tradeEnabled.receipt.status, true, "trade is not enabled");
    });

    it("2.1 should mint required tokens for buyer and for seller", async () => {

      let tokenAmountSeller = 8;
      let tokenAmountBuyer = 0;

      //check nft user balance before
      let balanceBeforeSeller = await nft.balanceOf(seller);
      let balanceBeforeBuyer = await nft.balanceOf(buyer);

      //mint.js
      web3.eth.getAccounts(function(err,res) {accounts = res;});

      let generatorSeller = await factory.addGenerator(seller);
      let generatorBuyer = await factory.addGenerator(buyer);

      let generation = 0;
      let quality = 1;

      //mint 2 tokens of each quality
      for(var i = 0; i < tokenAmountSeller; i++){
        let returnedId = await factory.mintQuality(seller, generation, quality);
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

    it("2.2. should mint some ERC20 tokens", async () => {
      let crownsAmount = web3.utils.toWei("100", "ether");
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

      // scapes approve
      //await nft.approve(nftBurning.address, nftId, {from: player});
      await nft.setApprovalForAll(nftSwap.address, true, {from: seller});

      //get some Crowns
      await crowns.transfer(seller, crownsAmount, {from: gameOwner});
      await sampleERC20Token.transfer(seller, crownsAmount, {from: gameOwner});


      let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      assert.equal(sellerCwsBalanceBefore+ crownsAmount/finney, sellerCwsBalanceAfter, "Seller didnt receive enough crowns");
      });

    xit("3. should create offer id1: no bounty 1 for 1 nft", async() => {

      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      //structure: [tokenAddress, imgId, generation, quality]
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [nftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [null], [null], [null], [null]
      ];
      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft and cws seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      console.log("nfts before: " ,parseInt(sellerNftBalanceBefore));
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      console.log("cws before: " ,sellerCwsBalanceBefore);

      // crowns approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // contract main function calls
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress,
         {from: seller}).catch(console.error);
         offersAmount ++;
         nftIdCount+=offerTokensAmount;

       //check nft and cws seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       console.log("nfts after: " ,parseInt(sellerNftBalanceAfter));
       let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       console.log("cws after: " ,sellerCwsBalanceAfter);
       assert.equal(parseInt(sellerNftBalanceAfter)+ offerTokensAmount, parseInt(sellerNftBalanceBefore), `${offerTokensAmount} tokens should be taken from seller`);
       assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + fee/finney + bounty/finney,  "Seller didnt pay enough fee");

    });

    xit("4. should create offer id2: 10cws bounty 1 for 2 nfts", async() => {
       let offerTokensAmount = 1;
       let offeredTokensArray = [
         [nftIdCount, nft.address],
         ["0", "0x0000000000000000000000000000000000000000"],
         ["0", "0x0000000000000000000000000000000000000000"],
         ["0", "0x0000000000000000000000000000000000000000"],
         ["0", "0x0000000000000000000000000000000000000000"],
       ];
       nftIdCount+=offerTokensAmount;
       let requestedTokensAmount = 2;
       //structure: [tokenAddress, imgId, generation, quality]
       let requestedTokenParams = [
         [nft.address, "24", "0", "4"],
         [nft.address, "14", "1", "3"],
         [null], [null], [null]
       ];
       let bounty = web3.utils.toWei("10", "ether");
       let bountyAddress = crowns.address;


       // encode requestedToken parameters
       for(let i = 0; i < requestedTokensAmount; i++){
         encodedData = await encodeNft(offersAmount, requestedTokenParams[i][1],
           requestedTokenParams[i][2], requestedTokenParams[i][3]);
         requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData];

       }


       //check nft and cws seller balance before
       let sellerNftBalanceBefore = await nft.balanceOf(seller);
       console.log("nfts before: " ,parseInt(sellerNftBalanceBefore));
       let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       console.log("cws before: " ,sellerCwsBalanceBefore);

       // crowns approve
       await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
       let allowance = await crowns.allowance(seller, nftSwap.address);
       assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

       // create offer
       let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
          {from: seller}).catch(console.error);
          offersAmount ++;


        //check nft and cws seller balance after
        let sellerNftBalanceAfter = await nft.balanceOf(seller);
        console.log("nfts after: " ,parseInt(sellerNftBalanceAfter));
        let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
        console.log("cws after: " ,sellerCwsBalanceAfter);
        assert.equal(parseInt(sellerNftBalanceAfter)+ offerTokensAmount, parseInt(sellerNftBalanceBefore), `${offerTokensAmount} tokens should be taken from seller`);
        assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + fee/finney + bounty/finney,  "Seller didnt pay enough fee");

    });

    it("5. should create offer id3: 10eth bounty 2 for 1 nfts", async() => {

      // parameters for createOffer
      let offerTokensAmount = 2;
      let requestedTokensAmount = 1;
      //structure: [tokenAddress, imgId, generation, quality]
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [nftIdCount, nft.address],
        [nftIdCount+1, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [null], [null], [null], [null]
      ];

      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft and cws seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      console.log("nfts before: " ,parseInt(sellerNftBalanceBefore));
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      console.log("cws before: " ,sellerCwsBalanceBefore);
      let sellerSampleERC20BalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(seller))/finney);
      console.log("SampleERC20 before: " ,sellerSampleERC20BalanceBefore);

      // crowns approve
      await crowns.approve(nftSwap.address, fee, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee, "not enough cws allowed to be spent");
      await sampleERC20Token.approve(nftSwap.address, bounty, {from: seller});
      allowance = await sampleERC20Token.allowance(seller, nftSwap.address);
      assert.equal(allowance, bounty, "not enough sampleERC20 allowed to be spent");

      // add bounty address
      let bountyAddressAdded = await nftSwap.addSupportedBountyAddresses(sampleERC20Token.address, {from: gameOwner})
        .catch(console.error);

      // contract main function calls
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress,
         {from: seller}).catch(console.error);
         offersAmount ++;
         nftIdCount+=offerTokensAmount;

       //check nft and cws seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       console.log("nfts after: " ,parseInt(sellerNftBalanceAfter));
       let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       console.log("cws after: " ,sellerCwsBalanceAfter);
       let sellerSampleERC20BalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(seller))/finney);
       console.log("SampleERC20 after: " ,sellerSampleERC20BalanceAfter);
       assert.equal(parseInt(sellerNftBalanceAfter)+ offerTokensAmount, parseInt(sellerNftBalanceBefore), `${offerTokensAmount} tokens should be taken from seller`);
       assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + fee/finney,  "Seller didnt pay enough fee");
       assert.equal(sellerSampleERC20BalanceBefore, sellerCwsBalanceAfter + bounty/finney,  "Seller didnt pay enough bounty");

    });

    xit("6. should create offer id4: 10cws bounty 5 for 5 nfts", async() => {

      let offerTokensAmount = 5;
      let offeredTokensArray = [
        [nftIdCount, nft.address],
        [nftIdCount+1, nft.address],
        [nftIdCount+2, nft.address],
        [nftIdCount+3, nft.address],
        [nftIdCount+4, nft.address],
      ];
      nftIdCount+=offerTokensAmount;
      let requestedTokensAmount = 5;
      //structure: [tokenAddress, imgId, generation, quality]
      let requestedTokenParams = [
        [nft.address, "24", "0", "1"],
        [nft.address, "511", "1", "1"],
        [nft.address, "94", "0", "1"],
        [nft.address, "7", "1", "1"],
        [nft.address, "115", "1", "1"],
      ];
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = crowns.address;

      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){
        encodedData = await encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);
        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData];
      }

      //check nft and cws seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      console.log("nfts before: " ,parseInt(sellerNftBalanceBefore));
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      console.log("cws before: " ,sellerCwsBalanceBefore);

      // crowns approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // create offer
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
         {from: seller}).catch(console.error);
         offersAmount ++;


       //check nft and cws seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       console.log("nfts after: " ,parseInt(sellerNftBalanceAfter));
       let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       console.log("cws after: " ,sellerCwsBalanceAfter);
       assert.equal(parseInt(sellerNftBalanceAfter)+ offerTokensAmount, parseInt(sellerNftBalanceBefore), `${offerTokensAmount} tokens should be taken from seller`);
       assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + fee/finney + bounty/finney,  "Seller didnt pay enough fee");

    });

    xit("6.1 should cancel offerid4", async() => {
      let offerId = 4;
      // the following values could be fetched from SC
      let offerTokensAmount = 5;
      let bounty = web3.utils.toWei("10", "ether");
      let fee = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;


      //check nft, fee and bounty seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      console.log("nfts before: " ,parseInt(sellerNftBalanceBefore));
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      console.log("cws before: " ,sellerCwsBalanceBefore);
      //main contract calls
      let offerCanceled= await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);

      //check nft, fee and bounty seller balance after
      let sellerNftBalanceAfter = await nft.balanceOf(seller);
      console.log("nfts after: " ,parseInt(sellerNftBalanceAfter));
      let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      console.log("cws after: " ,sellerCwsBalanceAfter);
      assert.equal(parseInt(sellerNftBalanceBefore) + offerTokensAmount, parseInt(sellerNftBalanceAfter), `${offerTokensAmount} tokens should be returned to seller`);
      assert.equal(sellerCwsBalanceBefore + bounty/finney +fee/finney, sellerCwsBalanceAfter,  "Seller didnt receive sufficient fee");
      });

    xit("7. shouldnt create an offer without offerTokens (0 for 1 nfts)", async() => {

      let offerTokensAmount = 0;
      let offeredTokensArray = [
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      nftIdCount+=offerTokensAmount;
      let requestedTokensAmount = 1;
      //structure: [tokenAddress, imgId, generation, quality]
      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [null], [null], [null], [null]
      ];
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;

      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){
        encodedData = await encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);
        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData];

      }


      // crowns approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
           {from: seller}).catch(console.error);
        offersAmount ++;
      }catch(e){
        assert.equal(e.reason, "should offer at least one nft");
      }

    });

    xit("8. shouldnt create an offer without requestedTokens (1 for 0 nfts)", async() => {

      let offerTokensAmount = 0;
      let offeredTokensArray = [
        [nftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensAmount = 1;
      //structure: [tokenAddress, imgId, generation, quality]
      let requestedTokenParams = [
        [null], [null], [null], [null], [null]
      ];
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;

      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){
        encodedData = await encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);
        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData];
      }

      // ERC20 approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
           {from: seller}).catch(console.error);
        offersAmount ++;
        nftIdCount+=offerTokensAmount;
      }catch(e){
        assert.equal(e.reason, "should require at least one nft");
      }

    });

    xit("9. shouldnt create offer with more than 5 offerTokens (6 for 5 nfts)", async() => {
      // parameters for createOffer
      let offerTokensAmount = 6;
      let requestedTokensAmount = 5;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [
        //structure: [tokenAddress, imgId, generation, quality]
        [nftIdCount, nft.address],
        [nftIdCount+1, nft.address],
        [nftIdCount+2, nft.address],
        [nftIdCount+3, nft.address],
        [nftIdCount+4, nft.address],
        [nftIdCount+5, nft.address],
      ];

      //structure: [tokenAddress, imgId, generation, quality]
      let requestedTokenParams = [
        [nft.address, "24", "0", "1"],
        [nft.address, "511", "1", "1"],
        [nft.address, "94", "0", "1"],
        [nft.address, "7", "1", "1"],
        [nft.address, "115", "1", "1"],
      ];
      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];

      }


      // ERC20 approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
           {from: seller}).catch(console.error);
        offersAmount ++;
        nftIdCount+=offerTokensAmount;
        assert.fail;
      }catch(e){
        assert(true);
        //assert.equal(e.reason, "should require at least one nft");
      }

    });

    xit("10. shouldnt create offer with more than 5 requestedTokens (5 for 6 nfts)", async() => {

      // parameters for createOffer
      let offerTokensAmount = 6;
      let requestedTokensAmount = 5;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [
        // structure: [nftAddress,imgId,]
        [nftIdCount, nft.address],
        [nftIdCount+1, nft.address],
        [nftIdCount+2, nft.address],
        [nftIdCount+3, nft.address],
        [nftIdCount+4, nft.address],
      ];

      //structure: [tokenAddress, imgId, generation, quality]
      let requestedTokenParams = [
        [nft.address, "24", "0", "1"],
        [nft.address, "511", "1", "1"],
        [nft.address, "94", "0", "1"],
        [nft.address, "7", "1", "1"],
        [nft.address, "115", "1", "1"],
        [nft.address, "275", "4", "5"]
      ];
      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];

      }


      // ERC20 approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
           {from: seller}).catch(console.error);
        offersAmount ++;
        nftIdCount+=offerTokensAmount;
        assert.fail;
      }catch(e){
        assert(true);
        //assert.equal(e.reason, "should require at least one nft");
      }

    });

    it("11. shouldnt create an offer with unsupportedBounty (bounty 10eth)", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      //structure: [tokenAddress, imgId, generation, quality]
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [nftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];

      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [null], [null], [null], [null]
      ];
      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      // crowns approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");
      allowance = await sampleERC20Token.allowance(seller, nftSwap.address);
      assert.equal(allowance, bounty, "not enough sampleERC20 allowed to be spent");

      // remove bounty address
      let bountyAddressRemoved = await nftSwap.removeSupportedBountyAddresses(sampleERC20Token.address, {from: gameOwner})
        .catch(console.error);

      try{
      //if createOffer() dont fail, test should fail
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress,
         {from: seller}).catch(console.error);
         offersAmount ++;
         nftIdCount+=offerTokensAmount;
       assert.fail;
       }catch(e){
         //if createOffer() fails, the test should pass
         assert.equal(e.reason, "bounty address not supported");
       }
    });

    it("12. shouldnt create an offer exceeding maxRequestedTokens (1 for 2 nfts)", async() => {

      let offerTokensAmount = 1;
      let offeredTokensArray = [
        [nftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];

      let requestedTokensAmount = 2;
      //structure: [tokenAddress, imgId, generation, quality]
      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [nft.address, "14", "1", "3"],
        [null], [null], [null]
      ];
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;

      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){
        encodedData = await encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);
        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData];

      }


      // crowns approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

       // set requestedTokens amount to 1
      let setRequestedTokensAmount = await nftSwap.setRequestedTokensAmount(1, {from: gameOwner});

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
           {from: seller}).catch(console.error);
        offersAmount ++;
        nftIdCount+=offerTokensAmount;
        assert.fail;
      }catch(e){
        assert.equal(e.reason, "cant exceed maxRequestedTokens");
      }

    });

    it("13. shouldnt create an offer exceeding maxOfferedTokens (2 for 1 nfts)", async() => {

      let offerTokensAmount = 2;
      let offeredTokensArray = [
        [nftIdCount, nft.address],
        [nftIdCount+1, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensAmount = 1;
      //structure: [tokenAddress, imgId, generation, quality]
      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [null], [null], [null], [null]
      ];
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;

      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){
        encodedData = await encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);
        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData];
      }

      // crowns approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

       // set requestedTokens amount to 1
      let setOfferedTokensAmount = await nftSwap.setOfferedTokensAmount(1, {from: gameOwner});

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
           {from: seller}).catch(console.error);
        offersAmount ++;
        nftIdCount+=offerTokensAmount;
        assert.fail;
      }catch(e){
        assert.equal(e.reason, "cant exceed maxRequestedTokens");
      }
    });

    it("14. should create offer id5: 0.25eth bounty 2 for 2 nft, 0.75cws fee", async() => {

      // parameters for createOffer
      let offerTokensAmount = 2;
      let requestedTokensAmount = 2;
      let bounty = web3.utils.toWei("250", "milli");
      let bountyAddress = sampleERC20Token.address;
      let feeRate = web3.utils.toWei("750", "milli");
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        //[nftId, nftAddress]
        [nftIdCount, nft.address],
        [nftIdCount+1, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];

      let requestedTokenParams = [
        //[tokenAddress, imgId, generation, quality]
        [nft.address, "24", "0", "4"],
        [nft.address, "11", "1", "2"],
        [null], [null], [null],
      ];
      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft, fee and bounty seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      console.log("nfts before: " ,parseInt(sellerNftBalanceBefore));
      let sellerBountyBalanceBefore = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
      console.log("sampleErc20 before: " ,sellerBountyBalanceBefore);
      let sellerFeeBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      console.log("cws before: " ,sellerFeeBalanceBefore);

      // crowns approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");
      allowance = await sampleERC20Token.allowance(seller, nftSwap.address);
      assert.equal(allowance, bounty, "not enough sampleERC20 allowed to be spent");

      // configure the contract
      try{
        let feeChanged = await nftSwap.setFee(feeRate, {from: gameOwner});
        let supportedBountyAddressAdded = await nftSwap.addSupportedBountyAddresses(bountyAddress, {from: gameOwner});
        let offeredTokensAmount = await nftSwap.setOfferedTokensAmount(2, {from: gameOwner});
        let requestedTokensAmount = await nftSwap.setRequestedTokensAmount(2, {from: gameOwner});
      } catch(e) {
        console.log("error configuring the contract.")
      }
      // contract main function calls
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress,
         {from: seller}).catch(console.error);
         offersAmount ++;
         nftIdCount+=offerTokensAmount;

       //check nft, fee and bounty seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       console.log("nfts after: " ,parseInt(sellerNftBalanceAfter));
       let sellerBountyBalanceAfter = Math.floor(parseInt(await bountyAddress.balanceOf(seller))/finney);
       console.log("sampleERC20 after: " ,sellerCwsBalanceAfter);
       let sellerFeeBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       console.log("cws after: " ,sellerCwsBalanceAfter);
       assert.equal(parseInt(sellerNftBalanceAfter), parseInt(sellerNftBalanceBefore) + offerTokensAmount, `${offerTokensAmount} tokens should be taken from seller`);
       assert.equal(sellerBountyBalanceBefore, sellerBountyBalanceAfter + bounty/finney,  "Seller didnt pay sufficient bounty");
       assert.equal(sellerFeeBalanceBefore, sellerFeeBalanceAfter + feeRate/finney,  "Seller didnt pay sufficient fee");
    });

    xit("15. shouldnt create an offer when trade is disabled (1 for 1 nfts)", async() => {
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

    xit("16. should cancel offer id1 even when trade is disabled", async() => {
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

    xit("17. shouldnt cancel offer id1 when its already canceled", async() => {
      let offerId = 1;

      try{
      //if cancelOffer() dont fail, test should fail
      let offerCanceled= await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);
       }catch{
         //if cancelOffer() fails, the test should pass
         assert(true);
       }
    });

    xit("18. shouldnt cancel offer id2 when sender not author", async() => {
      let offerId = 2;

      try{
      //if cancelOffer() dont fail, test should fail
      let offerCanceled= await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);
       }catch{
         //if cancelOffer() fails, the test should pass
         assert(true);
       }
    });

    xit("19. shouldnt accept offer id2 when trade is disabled", async() => {
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

    xit("20. shouldnt accept offer id1 when offer has been canceled", async() => {
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

    xit("21. shouldnt accept self-made offer id2", async() => {
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

    xit("23. shouldnt accept offer id2 when requested token addresses dont match", async() => {
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

    xit("24. shouldnt accept offer id3 with insufficient bounty tokens", async() => {
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

    xit("27. should accept offer id2", async() => {
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

    xit("28. should accept offer id3", async() => {
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

    xit("29. should accept offer id5", async() => {
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

    xit("30. shouldnt accept offer id2 when its already been accepted", async() => {
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
