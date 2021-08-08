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
    let sellerNftIdCount = 1;
    let buyerNftIdCount;




    // edit here add scapeSwapParams
    it("0.1 should link required contracts", async () => {
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


    it("0.2 should mint required ERC721 tokens", async () => {
      let tokenAmountSeller = 12;
      let tokenAmountBuyer = 5;

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

      // set buyerNftIdCount
      buyerNftIdCount = tokenAmountSeller + 1;

      //check nft user balance after
      let balanceAfterSeller = await nft.balanceOf(seller);
      assert.equal(parseInt(balanceAfterSeller), parseInt(balanceBeforeSeller) + tokenAmountSeller, `${tokenAmountSeller} tokens should be minted for seller`);
      let balanceAfterBuyer = await nft.balanceOf(buyer);
      assert.equal(parseInt(balanceAfterBuyer), parseInt(balanceBeforeBuyer) + tokenAmountBuyer, `${tokenAmountBuyer} tokens should be minted for buyer`);

    });


    it("0.3 should mint required ERC20 tokens", async () => {
      let crownsAmount = web3.utils.toWei("100", "ether");
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

      // scapes approve
      //await nft.approve(nftBurning.address, nftId, {from: player});
      await nft.setApprovalForAll(nftSwap.address, true, {from: seller});
      await nft.setApprovalForAll(nftSwap.address, true, {from: buyer});

      //get some Crowns
      await crowns.transfer(seller, crownsAmount, {from: gameOwner});
      await sampleERC20Token.transfer(seller, crownsAmount, {from: gameOwner});

      let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      assert.equal(sellerCwsBalanceBefore+ crownsAmount/finney, sellerCwsBalanceAfter, "Seller didnt receive enough crowns");
      });


      // edit here enableSwapContractAddress
      it("1. should initialize the contract", async () => {
        // configure the contract
        let nftAddressAdded = await nftSwap.enableSupportedNftAddress(nft.address, scapeSwapParams.address,
          {from: gameOwner}).catch(console.error);
        let tradeEnabled = await nftSwap.enableTrade(true, {from: gameOwner}).catch(console.error);

        // verify swapParams address added to mappping
        // assert.equal(nftSwap.supportedNftAddresses[nft.address], scapeSwapParams.address
        //   ,"swap params address not added");
        assert.equal(tradeEnabled.receipt.status, true, "trade is not enabled");
      });

      it("2. shouldnt create offer with more than 5 offerTokens (6 for 5 nfts)", async() => {
        // parameters for createOffer
        let offerTokensAmount = 6;
        let requestedTokensAmount = 5;
        let bounty = web3.utils.toWei("0", "ether");
        let bountyAddress = crowns.address;
        let offeredTokensArray = [
          //structure: [tokenAddress, imgId, generation, quality]
          [sellerNftIdCount, nft.address],
          [sellerNftIdCount+1, nft.address],
          [sellerNftIdCount+2, nft.address],
          [sellerNftIdCount+3, nft.address],
          [sellerNftIdCount+4, nft.address],
        ];

        //structure: [tokenAddress, imgId, generation, quality]
        let requestedTokenParams = [
          [nft.address, "24", "0", "1"],
          [nft.address, "511", "1", "1"],
          [nft.address, "94", "0", "1"],
          [nft.address, "7", "1", "1"],
          [nft.address, "115", "1", "1"],
        ];
        let requestedTokensArray = [                          // this array must contain sample data for empty slots
          // structure: [nftAddress,imgId, ]
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
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
             {from: seller});
          offersAmount ++;
          sellerNftIdCount+=offerTokensAmount;
          assert.fail();
        }catch(e){
          assert.equal(e.reason, "exceeded maxOfferedTokens limit");
        }
      });


      it("3. shouldnt create offer with more than 5 requestedTokens (5 for 6 nfts)", async() => {
        // parameters for createOffer
        let offerTokensAmount = 5;
        let requestedTokensAmount = 6;
        let bounty = web3.utils.toWei("0", "ether");
        let bountyAddress = crowns.address;
        let offeredTokensArray = [
          // structure: [nftAddress,imgId,]
          [sellerNftIdCount, nft.address],
          [sellerNftIdCount+1, nft.address],
          [sellerNftIdCount+2, nft.address],
          [sellerNftIdCount+3, nft.address],
          [sellerNftIdCount+4, nft.address],
        ];
        let requestedTokensArray = [                          // this array must contain sample data for empty slots
          // structure: [nftAddress,imgId, ]
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
        ];
        //structure: [tokenAddress, imgId, generation, quality]
        let requestedTokenParams = [
          [nft.address, "24", "0", "1"],
          [nft.address, "511", "1", "1"],
          [nft.address, "94", "0", "1"],
          [nft.address, "7", "1", "1"],
          [nft.address, "115", "1", "1"],
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
             {from: seller});
          offersAmount ++;
          sellerNftIdCount+=offerTokensAmount;
          assert.fail();
        }catch(e){
          assert(true);
        }
      });


      it("4. should create offer id1: 10cws bounty 5 for 5 nfts", async() => {
        // parameters for createOffer
        let offerTokensAmount = 5;
        let requestedTokensAmount = 5;
        let bounty = web3.utils.toWei("10", "ether");
        let bountyAddress = crowns.address;
        let offeredTokensArray = [                            // this array must contain sample data for empty slots
          // structure: [nftId, nftAddress]
          [sellerNftIdCount, nft.address],
          [sellerNftIdCount+1, nft.address],
          [sellerNftIdCount+2, nft.address],
          [sellerNftIdCount+3, nft.address],
          [sellerNftIdCount+4, nft.address],
        ];
        let requestedTokensArray = [                          // this array must contain sample data for empty slots
          //structure: [tokenAddress, imgId, generation, quality]
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
          [nft.address, "0x00", "0", "0x00", "0x00"],
        ];
        let requestedTokenParams = [
          [nft.address, "24", "0", "4"],
          [nft.address, "99", "1", "1"],
          [nft.address, "3", "0", "1"],
          [nft.address, "3", "0", "1"],
          [nft.address, "3", "0", "1"],
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
        let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

        // crowns approve
        await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
        let allowance = await crowns.allowance(seller, nftSwap.address);
        assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

        // contract main function calls
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
          requestedTokensArray, bounty, bountyAddress,
           {from: seller}).catch(console.error);
           offersAmount ++;
           sellerNftIdCount+=offerTokensAmount;

         //check nft and cws seller balance after
         let sellerNftBalanceAfter = await nft.balanceOf(seller);
         let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
         assert.equal(parseInt(sellerNftBalanceAfter)+ offerTokensAmount, parseInt(sellerNftBalanceBefore), `${offerTokensAmount} tokens should be taken from seller`);
         assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + fee/finney + bounty/finney,  "Seller didnt pay enough fee + bounty");
      });


      it("5. should cancel offer id1", async() => {
        let offerId = 1;
        let offerTokensAmount = 5;
        let bounty = web3.utils.toWei("10", "ether");
        let fee = web3.utils.toWei("1", "ether");
        let bountyAddress = crowns.address;


        //check nft, fee and bounty seller balance before
        let sellerNftBalanceBefore = await nft.balanceOf(seller);
        let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
        //main contract calls
        let offerCanceled= await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);
        sellerNftIdCount-=offerTokensAmount;

        //check nft, fee and bounty seller balance after
        let sellerNftBalanceAfter = await nft.balanceOf(seller);
        let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
        assert.equal(parseInt(sellerNftBalanceBefore) + offerTokensAmount, parseInt(sellerNftBalanceAfter), `${offerTokensAmount} tokens should be returned to seller`);
        assert.equal(sellerCwsBalanceBefore + bounty/finney +fee/finney, sellerCwsBalanceAfter,  "Seller didnt receive sufficient fee");
      });


    it("6. should create offer id2: no bounty 1 for 1 nft", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [sellerNftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        //structure: [tokenAddress, imgId, generation, quality]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
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
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

      // crowns approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // contract main function calls
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress,
         {from: seller}).catch(console.error);
         offersAmount ++;
         sellerNftIdCount+=offerTokensAmount;

       //check nft and cws seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       assert.equal(parseInt(sellerNftBalanceAfter)+ offerTokensAmount, parseInt(sellerNftBalanceBefore), `${offerTokensAmount} tokens should be taken from seller`);
       assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + fee/finney + bounty/finney,  "Seller didnt pay enough fee");

    });


    it("7. should create offer id3: 10cws bounty 1 for 2 nfts", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 2;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [sellerNftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        //structure: [tokenAddress, imgId, generation, quality]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
      ];
      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [nft.address, "111", "1", "2"],
        [null], [null], [null]
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
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

      // crowns approve
      await crowns.approve(nftSwap.address, fee + bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // contract main function calls
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress,
         {from: seller}).catch(console.error);
         offersAmount ++;
         sellerNftIdCount+=offerTokensAmount;

       //check nft and cws seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       assert.equal(parseInt(sellerNftBalanceAfter)+ offerTokensAmount, parseInt(sellerNftBalanceBefore), `${offerTokensAmount} tokens should be taken from seller`);
       assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + fee/finney + bounty/finney,  "Seller didnt pay enough fee + bounty");
    });


    it("8. should create offer id4: 10eth bounty 2 for 1 nfts", async() => {
      // parameters for createOffer
      let offerTokensAmount = 2;
      let requestedTokensAmount = 1;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [sellerNftIdCount, nft.address],
        [sellerNftIdCount+1, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        //structure: [tokenAddress, imgId, generation, quality]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
      ];
      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [null], [null], [null], [null]
      ];

      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;

      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft and cws seller balance before
      let sellerNftBalanceBefore = await nft.balanceOf(seller);
      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      let sellerSampleERC20BalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(seller))/finney);

      // crowns approve
      await crowns.approve(nftSwap.address, fee, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee, "not enough cws allowed to be spent");
      await sampleERC20Token.approve(nftSwap.address, bounty, {from: seller});
      allowance = await sampleERC20Token.allowance(seller, nftSwap.address);
      assert.equal(allowance, bounty, "not enough sampleERC20 allowed to be spent");

      // configure the contract
      let bountyAddressAdded = await nftSwap.addSupportedBountyAddresses(sampleERC20Token.address, {from: gameOwner})
        .catch(console.error);

      // contract main function calls
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: seller}).catch(console.error);
         offersAmount ++;
         sellerNftIdCount+=offerTokensAmount;

       //check nft and cws seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       let sellerSampleERC20BalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(seller))/finney);
       assert.equal(parseInt(sellerNftBalanceAfter)+ offerTokensAmount, parseInt(sellerNftBalanceBefore), `${offerTokensAmount} tokens should be taken from seller`);
       assert.equal(sellerCwsBalanceBefore, sellerCwsBalanceAfter + fee/finney,  "Seller didnt pay enough fee");
       assert.equal(sellerSampleERC20BalanceBefore, sellerSampleERC20BalanceAfter + bounty/finney,  "Seller didnt pay enough bounty");
    });


    xit("9. shouldnt create offer with unsupported nft address", async() => {
    });


    it("10. shouldnt create an offer without offerTokens (0 for 1 nfts)", async() => {
      // parameters for createOffer
      let offerTokensAmount = 0;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        //structure: [tokenAddress, imgId, generation, quality]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
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

      // contract main function calls
      try{
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: seller});
         offersAmount ++;
         sellerNftIdCount+=offerTokensAmount;
     }catch(e){
       assert.equal(e.reason, "should offer at least one nft");
     }
   });


    it("11. shouldnt create an offer without requestedTokens (1 for 0 nfts)", async() => {
      let offerTokensAmount = 1;
      let offeredTokensArray = [
        [sellerNftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        // structure: [nftAddress,imgId, ]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
      ];
      let requestedTokensAmount = 0;
      //structure: [tokenAddress, imgId, generation, quality]
      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [null], [null], [null], [null],
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
           {from: seller});
        offersAmount ++;
        sellerNftIdCount+=offerTokensAmount;
        assert.fail();
      }catch(e){
        assert.equal(e.reason, "should require at least one nft");
      }
    });


    it("12. shouldnt create an offer with unsupportedBounty (bounty 10eth)", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      //structure: [tokenAddress, imgId, generation, quality]
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [sellerNftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];

      let requestedTokenParams = [
        [nft.address, "24", "0", "4"],
        [null], [null], [null], [null]
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        // structure: [nftAddress,imgId, ]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
      ];

      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeNft(offersAmount, requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      // erc20 approve
      await crowns.approve(nftSwap.address, fee, {from: seller});
      await sampleERC20Token.approve(nftSwap.address, bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(allowance, fee, "not enough cws allowed to be spent");
      allowance = await sampleERC20Token.allowance(seller, nftSwap.address);
      assert.equal(allowance, bounty, "not enough sampleERC20 allowed to be spent");

      // configure the contract
      let bountyAddressRemoved = await nftSwap.removeSupportedBountyAddresses(sampleERC20Token.address, {from: gameOwner})
        .catch(console.error);

      try{
      //if createOffer() dont fail, test should fail
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: seller});
         offersAmount ++;
         sellerNftIdCount+=offerTokensAmount;
       assert.fail();
       }catch(e){
         //if createOffer() fails, the test should pass
         assert.equal(e.reason, "bounty address not supported");
       }
    });


    it("13. shouldnt create an offer exceeding maxRequestedTokens (1 for 2 nfts)", async() => {

      let offerTokensAmount = 1;
      let offeredTokensArray = [
        [sellerNftIdCount, nft.address],
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
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        // structure: [nftAddress,imgId, ]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
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

       // configure the contract
      let setRequestedTokensAmount = await nftSwap.setRequestedTokensAmount(1, {from: gameOwner});

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
          requestedTokensArray, bounty, bountyAddress, {from: seller});
        offersAmount ++;
        sellerNftIdCount+=offerTokensAmount;
        assert.fail();
      }catch(e){
        assert(true);
      }
    });


    it("14. shouldnt create an offer exceeding maxOfferedTokens (2 for 1 nfts)", async() => {
      let offerTokensAmount = 2;
      let offeredTokensArray = [
        [sellerNftIdCount, nft.address],
        [sellerNftIdCount+1, nft.address],
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
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        // structure: [nftAddress,imgId, ]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
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

       // configure the contract
      let setOfferedTokensAmount = await nftSwap.setOfferedTokensAmount(1, {from: gameOwner});

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray,
          requestedTokensAmount, requestedTokensArray, bounty, bountyAddress, {from: seller});
        offersAmount ++;
        sellerNftIdCount+=offerTokensAmount;
        assert.fail();
      }catch(e){
        assert(true);
      }
    });


    it("15. should create offer id5: 0.25eth bounty 2 for 2 nft, 0.75cws fee", async() => {
      // parameters for createOffer
      let offerTokensAmount = 2;
      let requestedTokensAmount = 2;
      let bounty = web3.utils.toWei("250", "milli");
      let bountyAddress = sampleERC20Token.address;
      let feeRate = web3.utils.toWei("750", "milli");
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        //[nftId, nftAddress]
        [sellerNftIdCount, nft.address],
        [sellerNftIdCount+1, nft.address],
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
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        // structure: [nftAddress,imgId, ]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
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
      let sellerBountyBalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(seller))/finney);
      let sellerFeeBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);

      // ERC20 approve
      await crowns.approve(nftSwap.address, fee, {from: seller});
      await sampleERC20Token.approve(nftSwap.address, bounty, {from: seller});
      let allowance = await crowns.allowance(seller, nftSwap.address);
      assert.equal(parseInt(allowance), fee, "not enough cws allowed to be spent");
      allowance = await sampleERC20Token.allowance(seller, nftSwap.address);
      assert.equal(parseInt(allowance), bounty, "not enough sampleERC20 allowed to be spent");

      // configure the contract
      try{
        let feeChanged = await nftSwap.setFee(feeRate, {from: gameOwner});
        let supportedBountyAddressAdded = await nftSwap.addSupportedBountyAddresses(bountyAddress, {from: gameOwner});
        let offeredTokensAmount = await nftSwap.setOfferedTokensAmount(2, {from: gameOwner});
        let requestedTokensAmount = await nftSwap.setRequestedTokensAmount(2, {from: gameOwner});
      } catch(e) {
      }
      // contract main function calls
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: seller});
         offersAmount ++;
         sellerNftIdCount+=offerTokensAmount;

       //check nft, fee and bounty seller balance after
       let sellerNftBalanceAfter = await nft.balanceOf(seller);
       let sellerBountyBalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(seller))/finney);
       let sellerFeeBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
       assert.equal(parseInt(sellerNftBalanceAfter) + offerTokensAmount, parseInt(sellerNftBalanceBefore), `${offerTokensAmount} tokens should be taken from seller`);
       assert.equal(sellerBountyBalanceBefore, sellerBountyBalanceAfter + bounty/finney,  "Seller didnt pay sufficient bounty");
       assert.equal(sellerFeeBalanceBefore, sellerFeeBalanceAfter + feeRate/finney,  "Seller didnt pay sufficient fee");
    });


    it("16. shouldnt create an offer when trade is disabled (1 for 1 nfts)", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [sellerNftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        // structure: [tokenAddress, imgId, generation, quality]
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
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

      // configure the contract
      let tradeDisabled = await nftSwap.enableTrade(false, {from: gameOwner});

      // contract main function calls
      try{
        let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray,
          requestedTokensAmount, requestedTokensArray, bounty, bountyAddress, {from: seller});
         offersAmount ++;
         sellerNftIdCount+=offerTokensAmount;
         assert.fail();
       }catch(e){
         assert.equal(e.reason, "trade is disabled");
       }
    });


    it("17. should cancel offer id2 even when trade is disabled", async() => {
      let offerId = 2;
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
      let sellerFeeBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/finney);
      assert.equal(parseInt(sellerNftBalanceBefore) + offerTokensAmount, parseInt(sellerNftBalanceAfter), `${offerTokensAmount} tokens should be returned to seller`);
      assert.equal(sellerFeeBalanceBefore + fee/finney, sellerFeeBalanceAfter,  "Seller didnt receieve sufficient fee");
    });


    it("18. shouldnt cancel offer id2 when its already canceled", async() => {
      let offerId = 2;

      // contract main function calls
      try{
        let offerCanceled= await nftSwap.cancelOffer(offerId, {from: seller});
        assert.fail();
      }catch(e){
        assert.equal(e.reason, "sender is not creator of offer");
      }
    });


    it("19. shouldnt cancel offer id3 when sender not author", async() => {
      let offerId = 3;

      // contract main function calls
      try{
        let offerCanceled= await nftSwap.cancelOffer(offerId, {from: buyer});
        assert.fail();
      } catch(e) {
         assert.equal(e.reason, "sender is not creator of offer");
       }
    });


    it("20. shouldnt accept offer id3 when trade is disabled", async() => {
      let offerId = 3;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [buyerNftIdCount, buyerNftIdCount+1, "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      // contract main function calls
      try{
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: buyer});
        buyerNftIdCount += requestedTokensAmount;
        assert.fail();
      }catch(e) {
         assert.equal(e.reason, "trade is disabled");
       }
    });


    it("21. shouldnt accept offer id2 when offer has been canceled", async() => {
      let offerId = 2;
      let requestedTokensAmount = 1;
      let requestedTokenIds =  [buyerNftIdCount, buyerNftIdCount+1, "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      // configure the contract
      let tradeEnabled = await nftSwap.enableTrade(true, {from: gameOwner});

      // contract main function calls
      try{
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds,
        requestedTokenAddresses, {from: buyer});
        buyerNftIdCount += requestedTokensAmount;
      assert.fail();
       }catch{
         assert(true);
       }

    });


    it("22. shouldnt accept self-made offer id3", async() => {
      let offerId = 3;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [buyerNftIdCount, buyerNftIdCount+1, "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      // contract main function calls
      try{
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: seller});
        buyerNftIdCount += requestedTokensAmount;
        assert.fail();
      }catch(e) {
         assert.equal(e.reason, "cant buy self-made offer");
       }
    });

    //IMPROVE: use the nft address at which buyer tokens actually exist
    it("23. shouldnt accept offer id4 when requested token addresses dont match", async() => {
      let offerId = 4;
      let requestedTokenIds = [buyerNftIdCount, "0", "0", "0", "0"];
      let requestedTokenAddresses = [
        sampleERC20Token.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      // contract main function calls
      try{
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: buyer}).catch(console.error);
        buyerNftIdCount += requestedTokensAmount;
        assert.fail();
      }catch(e) {
        assert(true);
         //assert.equal(e.reason, "wrong requested token address");
       }
    });


    it("24. should accept offer id3", async() => {
      let offerId = 3;
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [buyerNftIdCount, buyerNftIdCount + 1, "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;
      let fee = web3.utils.toWei("1", "ether");

      //check nft and bounty buyer balance before
      let buyerNftBalanceBefore = parseInt(await nft.balanceOf(buyer));
      let sellerNftBalanceBefore = parseInt(await nft.balanceOf(seller));
      let buyerBountyBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(buyer))/finney);
      let contractCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(nftSwap.address))/finney);

      // contract main function calls
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: buyer}).catch(console.error);
      buyerNftIdCount+= requestedTokensAmount;

      //check nft and bounty buyer balance after. Check contracts crowns balance after
      let buyerNftBalanceAfter = parseInt(await nft.balanceOf(buyer));
      let sellerNftBalanceAfter = parseInt(await nft.balanceOf(seller));
      let buyerBountyBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(buyer))/finney);
      let contractCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(nftSwap.address))/finney);

      assert.equal(parseInt(buyerNftBalanceBefore) + offeredTokensAmount,
        parseInt(buyerNftBalanceAfter) + requestedTokensAmount, `buyer nft balances are incorrect`);
      assert.equal(parseInt(sellerNftBalanceBefore) + requestedTokensAmount ,
        parseInt(sellerNftBalanceAfter), `seller nft balances are incorrect`);
      assert.equal(buyerBountyBalanceBefore + bounty/finney, buyerBountyBalanceAfter,
        "Buyer didnt receieve sufficient bounty");
      assert.equal(contractCwsBalanceBefore, contractCwsBalanceAfter + fee/finney + bounty/finney,
        "Contract didnt spend fee amount of crowns");
    });


    it("25. should accept offer id4", async() => {
      let offerId = 4;
      let offeredTokensAmount = 2;
      let requestedTokensAmount = 1;
      let requestedTokenIds = [buyerNftIdCount, "0", "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;
      let fee = web3.utils.toWei("1", "ether");

      //check nft and bounty buyer balance before
      let buyerNftBalanceBefore = parseInt(await nft.balanceOf(buyer));
      let sellerNftBalanceBefore = parseInt(await nft.balanceOf(seller));
      let buyerBountyBalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(buyer))/finney);
      let contractCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(nftSwap.address))/finney);

      // contract main function calls
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: buyer}).catch(console.error);
      buyerNftIdCount+= requestedTokensAmount;

      //check nft and bounty buyer balance after. Check contracts crowns balance after
      let buyerNftBalanceAfter = parseInt(await nft.balanceOf(buyer));
      let sellerNftBalanceAfter = parseInt(await nft.balanceOf(seller));
      let buyerBountyBalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(buyer))/finney);
      let contractCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(nftSwap.address))/finney);

      assert.equal(parseInt(buyerNftBalanceBefore) + offeredTokensAmount,
        parseInt(buyerNftBalanceAfter) + requestedTokensAmount, `buyer nft balances are incorrect`);
      assert.equal(parseInt(sellerNftBalanceBefore) + requestedTokensAmount ,
        parseInt(sellerNftBalanceAfter), `seller nft balances are incorrect`);
      assert.equal(buyerBountyBalanceBefore + bounty/finney, buyerBountyBalanceAfter,
        "Buyer didnt receieve sufficient bounty");
      assert.equal(contractCwsBalanceBefore, contractCwsBalanceAfter + fee/finney,
        "Contract didnt spend fee amount of crowns");
    });


    it("26. shouldnt accept offer id3 when its already been accepted", async() => {
      let offerId = 3;
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [buyerNftIdCount, buyerNftIdCount + 1, "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;
      let fee = web3.utils.toWei("1", "ether");

      try{
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: buyer});
        buyerNftIdCount+= requestedTokensAmount;
        assert.fail();
      }catch(e) {
        assert(true);
         //assert.equal(e.reason, "wrong requested token address");
       }
    });


    it("27. should accept offer id5", async() => {
      let offerId = 5;
      let offeredTokensAmount = 2;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [buyerNftIdCount, buyerNftIdCount+1, "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      let bounty = web3.utils.toWei("250", "milli");
      let bountyAddress = sampleERC20Token.address;
      let fee = web3.utils.toWei("750", "milli");

      //check nft and bounty buyer balance before
      let buyerNftBalanceBefore = parseInt(await nft.balanceOf(buyer));
      let sellerNftBalanceBefore = parseInt(await nft.balanceOf(seller));
      let buyerBountyBalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(buyer))/finney);
      let contractCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(nftSwap.address))/finney);

      // contract main function calls
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: buyer}).catch(console.error);
      buyerNftIdCount+= requestedTokensAmount;

      //check nft and bounty buyer balance after. Check contracts crowns balance after
      let buyerNftBalanceAfter = parseInt(await nft.balanceOf(buyer));
      let sellerNftBalanceAfter = parseInt(await nft.balanceOf(seller));
      let buyerBountyBalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(buyer))/finney);
      let contractCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(nftSwap.address))/finney);

      assert.equal(parseInt(buyerNftBalanceBefore) + offeredTokensAmount,
        parseInt(buyerNftBalanceAfter) + requestedTokensAmount, `buyer nft balances are incorrect`);
      assert.equal(parseInt(sellerNftBalanceBefore) + requestedTokensAmount ,
        parseInt(sellerNftBalanceAfter), `seller nft balances are incorrect`);
      assert.equal(buyerBountyBalanceBefore + bounty/finney, buyerBountyBalanceAfter,
        "Buyer didnt receieve sufficient bounty");
      assert.equal(contractCwsBalanceBefore, contractCwsBalanceAfter + fee/finney,
        "Contract didnt spend fee amount of crowns");
    });

});
