let MultiSend = artifacts.require("./MultiSend.sol");
let Nft = artifacts.require("./SeascapeNft.sol");
let Factory = artifacts.require("./NftFactory.sol");



contract("Multi Send", async accounts => {




    let price = web3.utils.toWei("2", "ether");
    let tipsFeeRate = 100;
    let offersAmount = 0;

    // following vars present contracts
    let nft = null;
    let factory = null;
    let multiSend = null;

    //accounts
    let sender = null;
    let receiver = null;


    it("0.1 should link required contracts", async () => {
	     // scapeSwapParams = await ScapeSwapParams.deployed();
       factory = await Factory.deployed();
	     multiSend = await MultiSend.deployed();
	     nft = await Nft.deployed();

       //initialize accounts
       sender = accounts[1];
       receiver = accounts[2];

       await nft.setFactory(factory.address);
       await factory.addGenerator(multiSend.address, {from: gameOwner});
    });


    it("0.2 should mint required ERC721 tokens", async () => {
      let tokenAmountSeller = 0; //9
      let tokenAmountBuyer = 0;   //5

      let sampleTokenAmountSeller = 1;  //1
      let sampleTokenAmountBuyer = 1;   //1

      //check nft user balance before
      let balanceBeforeSeller = await nft.balanceOf(sender);
      let balanceBeforeBuyer = await nft.balanceOf(receiver);

      let sampleBalanceBeforeSeller = await sampleNft.balanceOf(sender);
      let sampleBalanceBeforeBuyer = await sampleNft.balanceOf(receiver);

      //mint.js
      web3.eth.getAccounts(function(err,res) {accounts = res;});

      //add generator role
      let generatorSeller = await factory.addGenerator(sender);
      let generatorBuyer = await factory.addGenerator(receiver);

      let generation = 0;
      let quality = 1;

      //mint tokens
      for(var i = 0; i < tokenAmountSeller; i++){
        let returnedId = await factory.mintQuality(sender, generation, quality);
      }
      for(var i = 0; i < tokenAmountBuyer; i++){
        await factory.mintQuality(receiver, generation, quality);
      }

      for(var i = 0; i < sampleTokenAmountSeller; i++){
        let returnedId = await sampleNft.mint(sender, generation, quality);
      }
      for(var i = 0; i < sampleTokenAmountBuyer; i++){
        await sampleNft.mint(receiver, generation, quality);
      }

      // scapes approve
      await nft.setApprovalForAll(multiSend.address, true, {from: sender});
      await nft.setApprovalForAll(multiSend.address, true, {from: receiver});

      await sampleNft.setApprovalForAll(multiSend.address, true, {from: sender});
      await sampleNft.setApprovalForAll(multiSend.address, true, {from: receiver});

      // set receiverNftIdCount
      receiverNftIdCount = tokenAmountSeller + 1;
      receiverSampleNftIdCount = sampleTokenAmountSeller + 1;

      //check nft user balance after
      let balanceAfterSeller = await nft.balanceOf(sender);
      assert.equal(parseInt(balanceAfterSeller), parseInt(balanceBeforeSeller) + tokenAmountSeller, `${tokenAmountSeller} tokens should be minted for sender`);
      let balanceAfterBuyer = await nft.balanceOf(receiver);
      assert.equal(parseInt(balanceAfterBuyer), parseInt(balanceBeforeBuyer) + tokenAmountBuyer, `${tokenAmountBuyer} tokens should be minted for receiver`);
      let sampleBalanceAfterSeller = await sampleNft.balanceOf(sender);
      assert.equal(parseInt(sampleBalanceAfterSeller), parseInt(sampleBalanceBeforeSeller) + sampleTokenAmountSeller, `${sampleTokenAmountSeller} sample tokens should be minted for sender`);
      let sampleBalanceAfterBuyer = await sampleNft.balanceOf(receiver);
      assert.equal(parseInt(sampleBalanceAfterBuyer), parseInt(sampleBalanceBeforeBuyer) + sampleTokenAmountBuyer, `${sampleTokenAmountBuyer} sample tokens should be minted for receiver`);
    });


    it("0.3 should mint required ERC20 tokens", async () => {
      let crownsAmount = web3.utils.toWei("100", "ether");
      let sampleERC20Amount = web3.utils.toWei("100", "ether");

      //check balances before
      let senderCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
      let senderBountyBalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(sender))/finney);

      //get some Crowns
      await crowns.transfer(sender, crownsAmount, {from: gameOwner});
      await sampleERC20Token.transfer(sender, crownsAmount, {from: gameOwner});

      let senderCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
      let senderBountyBalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(sender))/finney);

      assert.equal(senderCwsBalanceBefore+ crownsAmount/finney, senderCwsBalanceAfter, "Seller didnt receive enough crowns");
      assert.equal(senderBountyBalanceBefore+ crownsAmount/finney, senderCwsBalanceAfter, "Seller didnt receive enough crowns");
      });


      it("1. should initialize the contract", async () => {
        // configure the contract
        let nftAddressAdded = await multiSend.enableSupportedNftAddress(nft.address, scapeSwapParams.address,
          {from: gameOwner}).catch(console.error);
        let tradeEnabled = await multiSend.enableTrade(true, {from: gameOwner}).catch(console.error);

        // verify swapParams address added to mappping
        // assert.equal(multiSend.supportedNftAddresses[nft.address], scapeSwapParams.address
        //   ,"swap params address not added");
        assert.equal(tradeEnabled.receipt.status, true, "trade is not enabled");
      });


      xit("2. shouldnt create offer with more than 5 offerTokens (6 for 5 nfts)", async() => {
        // parameters for createOffer
        let offerTokensAmount = 6;
        let requestedTokensAmount = 5;
        let bounty = web3.utils.toWei("0", "ether");
        let bountyAddress = crowns.address;
        let offeredTokensArray = [
          //structure: [tokenAddress, imgId, generation, quality]
          [senderNftIdCount, nft.address],
          [senderNftIdCount+1, nft.address],
          [senderNftIdCount+2, nft.address],
          [senderNftIdCount+3, nft.address],
          [senderNftIdCount+4, nft.address],
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

          encodedData = encodeNft(requestedTokenParams[i][1],
            requestedTokenParams[i][2], requestedTokenParams[i][3]);

          let sig = await signParams(offersAmount, encodedData);

          requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
        }

        // ERC20 approve
        await crowns.approve(multiSend.address, fee + bounty, {from: sender});
        let allowance = await crowns.allowance(sender, multiSend.address);
        assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

        //main contract calls
        try{
        //if createOffer() dont fail, test should fail
          let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
             {from: sender});
          offersAmount ++;
          senderNftIdCount+=offerTokensAmount;
          assert.fail();
        }catch(e){
          assert.equal(e.reason, "exceeded maxOfferedTokens limit");
        }
      });


      xit("3. shouldnt create offer with more than 5 requestedTokens (5 for 6 nfts)", async() => {
        // parameters for createOffer
        let offerTokensAmount = 5;
        let requestedTokensAmount = 6;
        let bounty = web3.utils.toWei("0", "ether");
        let bountyAddress = crowns.address;
        let offeredTokensArray = [
          // structure: [nftAddress,imgId,]
          [senderNftIdCount, nft.address],
          [senderNftIdCount+1, nft.address],
          [senderNftIdCount+2, nft.address],
          [senderNftIdCount+3, nft.address],
          [senderNftIdCount+4, nft.address],
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

          encodedData = encodeNft(requestedTokenParams[i][1],
            requestedTokenParams[i][2], requestedTokenParams[i][3]);

          let sig = await signParams(offersAmount, encodedData);

          requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
        }

        // ERC20 approve
        await crowns.approve(multiSend.address, fee + bounty, {from: sender});
        let allowance = await crowns.allowance(sender, multiSend.address);
        assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

        //main contract calls
        try{
        //if createOffer() dont fail, test should fail
          let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
             {from: sender});
          offersAmount ++;
          senderNftIdCount+=offerTokensAmount;
          assert.fail();
        }catch(e){
          assert(true);
        }
      });


      xit("4. should create offer id1: 10cws bounty 5 for 5 nfts", async() => {
        // parameters for createOffer
        let offerTokensAmount = 5;
        let requestedTokensAmount = 5;
        let bounty = web3.utils.toWei("10", "ether");
        let bountyAddress = crowns.address;
        let offeredTokensArray = [                            // this array must contain sample data for empty slots
          // structure: [nftId, nftAddress]
          [senderNftIdCount, nft.address],
          [senderNftIdCount+1, nft.address],
          [senderNftIdCount+2, nft.address],
          [senderNftIdCount+3, nft.address],
          [senderNftIdCount+4, nft.address],
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
          [nft.address, "17", "0", "1"],
          [nft.address, "14", "0", "1"],
          [nft.address, "647", "0", "1"],
        ];
        // encode requestedToken parameters
        for(let i = 0; i < requestedTokensAmount; i++){

          encodedData = encodeNft(requestedTokenParams[i][1],
            requestedTokenParams[i][2], requestedTokenParams[i][3]);

          let sig = await signParams(offersAmount, encodedData);

          requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
        }

        //check nft and cws sender balance before
        let senderNftBalanceBefore = await nft.balanceOf(sender);
        let senderCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);

        // crowns approve
        await crowns.approve(multiSend.address, fee + bounty, {from: sender});
        let allowance = await crowns.allowance(sender, multiSend.address);
        assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

        // contract main function calls
        let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
          requestedTokensArray, bounty, bountyAddress,
           {from: sender}).catch(console.error);
           offersAmount ++;
           senderNftIdCount+=offerTokensAmount;


           let totalOffersAmount = parseInt(await multiSend.getLastOfferId());
           console.log("offers amount:" ,totalOffersAmount);

         //check nft and cws sender balance after
         let senderNftBalanceAfter = await nft.balanceOf(sender);
         let senderCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
         assert.equal(parseInt(senderNftBalanceAfter)+ offerTokensAmount, parseInt(senderNftBalanceBefore), `${offerTokensAmount} tokens should be taken from sender`);
         assert.equal(senderCwsBalanceBefore, senderCwsBalanceAfter + fee/finney + bounty/finney,  "Seller didnt pay enough fee + bounty");
      });


      xit("5. should cancel offer id1", async() => {
        let offerId = 1;
        let offerTokensAmount = 5;
        let bounty = web3.utils.toWei("10", "ether");
        let fee = web3.utils.toWei("1", "ether");
        let bountyAddress = crowns.address;


        //check nft, fee and bounty sender balance before
        let senderNftBalanceBefore = await nft.balanceOf(sender);
        let senderCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
        //main contract calls
        let offerCanceled= await multiSend.cancelOffer(offerId, {from: sender}).catch(console.error);
        senderNftIdCount-=offerTokensAmount;

        let totalOffersAmount = parseInt(await multiSend.getLastOfferId());
        console.log("offers amount:" ,totalOffersAmount);

        //check nft, fee and bounty sender balance after
        let senderNftBalanceAfter = await nft.balanceOf(sender);
        let senderCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
        assert.equal(parseInt(senderNftBalanceBefore) + offerTokensAmount, parseInt(senderNftBalanceAfter), `${offerTokensAmount} tokens should be returned to sender`);
        assert.equal(senderCwsBalanceBefore + bounty/finney +fee/finney, senderCwsBalanceAfter,  "Seller didnt receive sufficient fee");
      });


    xit("6. should create offer id2: no bounty 1 for 1 nft", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [senderNftIdCount, nft.address],
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

        encodedData = encodeNft(requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft and cws sender balance before
      let senderNftBalanceBefore = await nft.balanceOf(sender);
      let senderCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);

      // crowns approve
      await crowns.approve(multiSend.address, fee + bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // contract main function calls
      let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress,
         {from: sender}).catch(console.error);
         offersAmount ++;
         senderNftIdCount+=offerTokensAmount;

       //check nft and cws sender balance after
       let senderNftBalanceAfter = await nft.balanceOf(sender);
       let senderCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
       assert.equal(parseInt(senderNftBalanceAfter)+ offerTokensAmount, parseInt(senderNftBalanceBefore), `${offerTokensAmount} tokens should be taken from sender`);
       assert.equal(senderCwsBalanceBefore, senderCwsBalanceAfter + fee/finney + bounty/finney,  "Seller didnt pay enough fee");

    });


    xit("7. should create offer id3: 10cws bounty 1 for 2 nfts", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 2;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [senderNftIdCount, nft.address],
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

        encodedData = encodeNft(requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft and cws sender balance before
      let senderNftBalanceBefore = await nft.balanceOf(sender);
      let senderCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);

      // crowns approve
      await crowns.approve(multiSend.address, fee + bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // contract main function calls
      let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress,
         {from: sender}).catch(console.error);
         offersAmount ++;
         senderNftIdCount+=offerTokensAmount;

       //check nft and cws sender balance after
       let senderNftBalanceAfter = await nft.balanceOf(sender);
       let senderCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
       assert.equal(parseInt(senderNftBalanceAfter)+ offerTokensAmount, parseInt(senderNftBalanceBefore), `${offerTokensAmount} tokens should be taken from sender`);
       assert.equal(senderCwsBalanceBefore, senderCwsBalanceAfter + fee/finney + bounty/finney,  "Seller didnt pay enough fee + bounty");
    });


    xit("8. should create offer id4: 10eth bounty 2 for 1 nfts", async() => {
      // parameters for createOffer
      let offerTokensAmount = 2;
      let requestedTokensAmount = 1;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [senderNftIdCount, nft.address],
        [senderNftIdCount+1, nft.address],
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

        encodedData = encodeNft(requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft and cws sender balance before
      let senderNftBalanceBefore = await nft.balanceOf(sender);
      let senderCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
      let senderSampleERC20BalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(sender))/finney);

      // crowns approve
      await crowns.approve(multiSend.address, fee, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee, "not enough cws allowed to be spent");
      await sampleERC20Token.approve(multiSend.address, bounty, {from: sender});
      allowance = await sampleERC20Token.allowance(sender, multiSend.address);
      assert.equal(allowance, bounty, "not enough sampleERC20 allowed to be spent");

      // configure the contract
      let bountyAddressAdded = await multiSend.addSupportedBountyAddresses(sampleERC20Token.address, {from: gameOwner})
        .catch(console.error);

      // contract main function calls
      let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: sender}).catch(console.error);
         offersAmount ++;
         senderNftIdCount+=offerTokensAmount;

       //check nft and cws sender balance after
       let senderNftBalanceAfter = await nft.balanceOf(sender);
       let senderCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
       let senderSampleERC20BalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(sender))/finney);
       assert.equal(parseInt(senderNftBalanceAfter)+ offerTokensAmount, parseInt(senderNftBalanceBefore), `${offerTokensAmount} tokens should be taken from sender`);
       assert.equal(senderCwsBalanceBefore, senderCwsBalanceAfter + fee/finney,  "Seller didnt pay enough fee");
       assert.equal(senderSampleERC20BalanceBefore, senderSampleERC20BalanceAfter + bounty/finney,  "Seller didnt pay enough bounty");
    });


    xit("9. should create offer id5 with offered SampleNft token", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [senderSampleNftIdCount, sampleNft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
        [nft.address, "0x00", "0", "0x00", "0x00"],
      ];
      let requestedTokenParams = [
        //structure: [tokenAddress, imgId]
        [sampleNft.address, "24"],
        [null], [null], [null], [null]
      ];
      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeSampleNft(requestedTokenParams[i][1]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft and cws sender balance before
      let senderNftBalanceBefore = await sampleNft.balanceOf(sender);
      let senderCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);

      // crowns approve
      await crowns.approve(multiSend.address, fee + bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // configure the contract
      try{
      let nftAddressAdded = await multiSend.enableSupportedNftAddress(sampleNft.address, sampleSwapParams.address,
        {from: gameOwner}).catch(console.error);
      } catch(e) {
        console.log("nft address could not be added.");
        assert.fail();
      }

      // contract main function calls
      let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: sender}).catch(console.error);
        senderSampleNftIdCount += offerTokensAmount;
        offersAmount ++;

       //check nft and cws sender balance after
       let senderNftBalanceAfter = await sampleNft.balanceOf(sender);
       let senderCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
       assert.equal(parseInt(senderNftBalanceAfter)+ offerTokensAmount, parseInt(senderNftBalanceBefore),
         `${offerTokensAmount} tokens should be taken from sender`);
       assert.equal(senderCwsBalanceBefore, senderCwsBalanceAfter + fee/finney + bounty/finney,
         "Seller didnt pay enough fee");
    });


    xit("10. should cancel offer id5 with unsupported SampleNft address", async() => {

       let offerId = offersAmount;
       // the following values could be fetched from SC
       let offerTokensAmount = 1;
       let fee = web3.utils.toWei("1", "ether");

       //check nft, fee and bounty sender balance before
       let senderNftBalanceBefore = await sampleNft.balanceOf(sender);
       let senderFeeBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);

       // configure the contract
       try{
         let nftAddressDisabled = await multiSend.disableSupportedNftAddress(sampleNft.address, {from: gameOwner}).catch(console.error);
       } catch(e) {
         console.log("nft address could not be removed.");
         assert.fail();
       }

       //main contract calls
       let offerCanceled= await multiSend.cancelOffer(offerId, {from: sender}).catch(console.error);
       senderSampleNftIdCount -= offerTokensAmount;

       //check nft, fee and bounty sender balance after
       let senderNftBalanceAfter = await sampleNft.balanceOf(sender);
       let senderFeeBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
       assert.equal(parseInt(senderNftBalanceBefore) + offerTokensAmount, parseInt(senderNftBalanceAfter), `${offerTokensAmount} tokens should be returned to sender`);
       assert.equal(senderFeeBalanceBefore + fee/finney, senderFeeBalanceAfter,  "Seller didnt receieve sufficient fee");

    });

    xit("11. shouldnt create offer with unsupported requested SampleNft address", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;

      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [senderNftIdCount, nft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
      ];
      let requestedTokenParams = [
        //structure: [tokenAddress, imgId]
        [sampleNft.address, "24"],
        [null], [null], [null], [null]
      ];

      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeSampleNft(requestedTokenParams[i][1]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      // erc20 approve
      await crowns.approve(multiSend.address, fee, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee, "not enough cws allowed to be spent");

      // contract main function calls
      try{
        let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
          requestedTokensArray, bounty, bountyAddress, {from: sender});
        senderNftIdCount += offerTokensAmount;
        offersAmount ++;
        assert.fail();
       }catch(e){
         assert.equal(e.reason, "requested nft address unsupported");
       }

    });


    xit("12. shouldnt create offer with unsupported offered SampleNft address", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;

      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [senderSampleNftIdCount, sampleNft.address],
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

        encodedData = encodeNft(requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      // erc20 approve
      await crowns.approve(multiSend.address, fee, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee, "not enough cws allowed to be spent");

      // contract main function calls
      try{
        let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
          requestedTokensArray, bounty, bountyAddress, {from: sender});
        offersAmount ++;
        senderSampleNftIdCount += offerTokensAmount;
        assert.fail();
       }catch(e){
         assert.equal(e.reason, "offered nft address unsupported");
       }

    });

    it("13. should create offer id6 with (1 for 1) SampleNft token", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [senderSampleNftIdCount, sampleNft.address],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
        ["0", "0x0000000000000000000000000000000000000000"],
      ];
      let requestedTokensArray = [                          // this array must contain sample data for empty slots
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
        [sampleNft.address, "0x00", "0", "0x00", "0x00"],
      ];
      let requestedTokenParams = [
        //structure: [tokenAddress, imgId]
        [sampleNft.address, "24"],
        [null], [null], [null], [null]
      ];
      // encode requestedToken parameters
      for(let i = 0; i < requestedTokensAmount; i++){

        encodedData = encodeSampleNft(requestedTokenParams[i][1]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft and cws sender balance before
      let senderNftBalanceBefore = await sampleNft.balanceOf(sender);
      let senderCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);

      // crowns approve
      await crowns.approve(multiSend.address, fee + bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // configure the contract
      try{
      let nftAddressAdded = await multiSend.enableSupportedNftAddress(sampleNft.address, sampleSwapParams.address,
        {from: gameOwner}).catch(console.error);
      } catch(e) {
        console.log("nft address could not be added.");
        assert.fail();
      }

      // contract main function calls
      let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: sender}).catch(console.error);
         offersAmount ++;
         senderSampleNftIdCount += offerTokensAmount;

       //check nft and cws sender balance after
       let senderNftBalanceAfter = await sampleNft.balanceOf(sender);
       let senderCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
       assert.equal(parseInt(senderNftBalanceAfter)+ offerTokensAmount, parseInt(senderNftBalanceBefore),
         `${offerTokensAmount} tokens should be taken from sender`);
       assert.equal(senderCwsBalanceBefore, senderCwsBalanceAfter + fee/finney + bounty/finney,
         "Seller didnt pay enough fee");
    });

     it("14. should accept offer id6 with sampleNft token", async() => {
       let offerId = offersAmount;
       let offeredTokensAmount = 1;
       let requestedTokensAmount = 1;
       let requestedTokenIds = [receiverSampleNftIdCount, "0", "0", "0", "0"];
       let requestedTokenAddresses = [
         sampleNft.address,
         "0x0000000000000000000000000000000000000000",
         "0x0000000000000000000000000000000000000000",
         "0x0000000000000000000000000000000000000000",
         "0x0000000000000000000000000000000000000000"
       ];
       let v = ["0", "0", "0", "0", "0"];
       let r = ["0x00","0x00","0x00","0x00","0x00"];
       let s = ["0x00","0x00","0x00","0x00","0x00"];

       let bounty = web3.utils.toWei("10", "ether");
       let bountyAddress = crowns.address;
       let fee = web3.utils.toWei("1", "ether");

       //check nft and bounty receiver balance before
       let receiverNftBalanceBefore = parseInt(await sampleNft.balanceOf(receiver));
       let senderNftBalanceBefore = parseInt(await sampleNft.balanceOf(sender));
       let receiverBountyBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(receiver))/finney);
       let contractCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(multiSend.address))/finney);

       // encode requestedToken parameters
       for(let i = 0; i < requestedTokensAmount; i++){

         //encodedData = encodeRequestedNft(requestedTokenIds[i], requestedTokenAddresses[i]);

         let sig = await encodeRequestedNft(offersAmount, requestedTokenIds[i], requestedTokenAddresses[i]);

         v[i] = sig[0];
         r[i] = sig[1];
         s[i] = sig[2];
       }

       // contract main function calls
       let offerAccepted = await multiSend.acceptOffer(offerId, requestedTokenIds,
         requestedTokenAddresses, v, r, s, {from: receiver}).catch(console.error);
       receiverSampleNftIdCount += requestedTokensAmount;

       //check nft and bounty receiver balance after. Check contracts crowns balance after
       let receiverNftBalanceAfter = parseInt(await sampleNft.balanceOf(receiver));
       let senderNftBalanceAfter = parseInt(await sampleNft.balanceOf(sender));
       let receiverBountyBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(receiver))/finney);
       let contractCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(multiSend.address))/finney);

       assert.equal(parseInt(receiverNftBalanceBefore) + offeredTokensAmount,
         parseInt(receiverNftBalanceAfter) + requestedTokensAmount, `receiver nft balances are incorrect`);
       assert.equal(parseInt(senderNftBalanceBefore) + requestedTokensAmount ,
         parseInt(senderNftBalanceAfter), `sender nft balances are incorrect`);
       assert.equal(receiverBountyBalanceBefore + bounty/finney, receiverBountyBalanceAfter,
         "Buyer didnt receieve sufficient bounty");
       assert.equal(contractCwsBalanceBefore, contractCwsBalanceAfter + fee/finney + bounty/finney,
         "Contract didnt spend fee amount of crowns");
     });


    xit("15. shouldnt create an offer without offerTokens (0 for 1 nfts)", async() => {
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

        encodedData = encodeNft(requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      // crowns approve
      await crowns.approve(multiSend.address, fee + bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // contract main function calls
      try{
      let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: sender});
         offersAmount ++;
         senderNftIdCount+=offerTokensAmount;
     }catch(e){
       assert.equal(e.reason, "should offer at least one nft");
     }
   });


    xit("16. shouldnt create an offer without requestedTokens (1 for 0 nfts)", async() => {
      let offerTokensAmount = 1;
      let offeredTokensArray = [
        [senderNftIdCount, nft.address],
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
      await crowns.approve(multiSend.address, fee + bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount, requestedTokensArray, bounty, bountyAddress,
           {from: sender});
        offersAmount ++;
        senderNftIdCount+=offerTokensAmount;
        assert.fail();
      }catch(e){
        assert.equal(e.reason, "should require at least one nft");
      }
    });


    xit("17. shouldnt create an offer with unsupportedBounty (bounty 10eth)", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      //structure: [tokenAddress, imgId, generation, quality]
      let bounty = web3.utils.toWei("10", "ether");
      let bountyAddress = sampleERC20Token.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [senderNftIdCount, nft.address],
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

        encodedData = encodeNft(requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      // erc20 approve
      await crowns.approve(multiSend.address, fee, {from: sender});
      await sampleERC20Token.approve(multiSend.address, bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee, "not enough cws allowed to be spent");
      allowance = await sampleERC20Token.allowance(sender, multiSend.address);
      assert.equal(allowance, bounty, "not enough sampleERC20 allowed to be spent");

      // configure the contract
      let bountyAddressRemoved = await multiSend.removeSupportedBountyAddresses(sampleERC20Token.address, {from: gameOwner})
        .catch(console.error);

      try{
      //if createOffer() dont fail, test should fail
      let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: sender});
         offersAmount ++;
         senderNftIdCount+=offerTokensAmount;
       assert.fail();
       }catch(e){
         //if createOffer() fails, the test should pass
         assert.equal(e.reason, "bounty address not supported");
       }
    });


    xit("18. shouldnt create an offer exceeding maxRequestedTokens (1 for 2 nfts)", async() => {

      let offerTokensAmount = 1;
      let offeredTokensArray = [
        [senderNftIdCount, nft.address],
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
      await crowns.approve(multiSend.address, fee + bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

       // configure the contract
      let setRequestedTokensAmount = await multiSend.setRequestedTokensAmount(1, {from: gameOwner});

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
          requestedTokensArray, bounty, bountyAddress, {from: sender});
        offersAmount ++;
        senderNftIdCount+=offerTokensAmount;
        assert.fail();
      }catch(e){
        assert(true);
      }
    });


    xit("19. shouldnt create an offer exceeding maxOfferedTokens (2 for 1 nfts)", async() => {
      let offerTokensAmount = 2;
      let offeredTokensArray = [
        [senderNftIdCount, nft.address],
        [senderNftIdCount+1, nft.address],
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
      await crowns.approve(multiSend.address, fee + bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

       // configure the contract
      let setOfferedTokensAmount = await multiSend.setOfferedTokensAmount(1, {from: gameOwner});

      //main contract calls
      try{
      //if createOffer() dont fail, test should fail
        let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray,
          requestedTokensAmount, requestedTokensArray, bounty, bountyAddress, {from: sender});
        offersAmount ++;
        senderNftIdCount+=offerTokensAmount;
        assert.fail();
      }catch(e){
        assert(true);
      }
    });


    xit("20. should create offer id7: 0.25eth bounty 2 for 2 nft, 0.75cws fee", async() => {
      // parameters for createOffer
      let offerTokensAmount = 2;
      let requestedTokensAmount = 2;
      let bounty = web3.utils.toWei("250", "milli");
      let bountyAddress = sampleERC20Token.address;
      let feeRate = web3.utils.toWei("750", "milli");
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        //[nftId, nftAddress]
        [senderNftIdCount, nft.address],
        [senderNftIdCount+1, nft.address],
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

        encodedData = encodeNft(requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      //check nft, fee and bounty sender balance before
      let senderNftBalanceBefore = await nft.balanceOf(sender);
      let senderBountyBalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(sender))/finney);
      let senderFeeBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);

      // ERC20 approve
      await crowns.approve(multiSend.address, fee, {from: sender});
      await sampleERC20Token.approve(multiSend.address, bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(parseInt(allowance), fee, "not enough cws allowed to be spent");
      allowance = await sampleERC20Token.allowance(sender, multiSend.address);
      assert.equal(parseInt(allowance), bounty, "not enough sampleERC20 allowed to be spent");

      // configure the contract
      try{
        let feeChanged = await multiSend.setFee(feeRate, {from: gameOwner});
        let supportedBountyAddressAdded = await multiSend.addSupportedBountyAddresses(bountyAddress, {from: gameOwner});
        let offeredTokensAmount = await multiSend.setOfferedTokensAmount(2, {from: gameOwner});
        let requestedTokensAmount = await multiSend.setRequestedTokensAmount(2, {from: gameOwner});
      } catch(e) {
      }
      // contract main function calls
      let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: sender});
         offersAmount ++;
         senderNftIdCount+=offerTokensAmount;

       //check nft, fee and bounty sender balance after
       let senderNftBalanceAfter = await nft.balanceOf(sender);
       let senderBountyBalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(sender))/finney);
       let senderFeeBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
       assert.equal(parseInt(senderNftBalanceAfter) + offerTokensAmount, parseInt(senderNftBalanceBefore), `${offerTokensAmount} tokens should be taken from sender`);
       assert.equal(senderBountyBalanceBefore, senderBountyBalanceAfter + bounty/finney,  "Seller didnt pay sufficient bounty");
       assert.equal(senderFeeBalanceBefore, senderFeeBalanceAfter + feeRate/finney,  "Seller didnt pay sufficient fee");
    });


    xit("21. shouldnt create an offer when trade is disabled (1 for 1 nfts)", async() => {
      // parameters for createOffer
      let offerTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokensArray = [                            // this array must contain sample data for empty slots
        // structure: [nftId, nftAddress]
        [senderNftIdCount, nft.address],
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

        encodedData = encodeNft(requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(offersAmount, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }

      // crowns approve
      await crowns.approve(multiSend.address, fee + bounty, {from: sender});
      let allowance = await crowns.allowance(sender, multiSend.address);
      assert.equal(allowance, fee + bounty, "not enough cws allowed to be spent");

      // configure the contract
      let tradeDisabled = await multiSend.enableTrade(false, {from: gameOwner});

      // contract main function calls
      try{
        let offerCreated = await multiSend.createOffer(offerTokensAmount, offeredTokensArray,
          requestedTokensAmount, requestedTokensArray, bounty, bountyAddress, {from: sender});
         offersAmount ++;
         senderNftIdCount+=offerTokensAmount;
         assert.fail();
       }catch(e){
         assert.equal(e.reason, "trade is disabled");
       }
    });


    xit("22. should cancel offer id2 even when trade is disabled", async() => {
      let offerId = 2;
      // the following values could be fetched from SC
      let offerTokensAmount = 1;
      let fee = web3.utils.toWei("1", "ether");

      //check nft, fee and bounty sender balance before
      let senderNftBalanceBefore = await nft.balanceOf(sender);
      let senderFeeBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);

      //main contract calls
      let offerCanceled= await multiSend.cancelOffer(offerId, {from: sender}).catch(console.error);

      //check nft, fee and bounty sender balance after
      let senderNftBalanceAfter = await nft.balanceOf(sender);
      let senderFeeBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(sender))/finney);
      assert.equal(parseInt(senderNftBalanceBefore) + offerTokensAmount, parseInt(senderNftBalanceAfter), `${offerTokensAmount} tokens should be returned to sender`);
      assert.equal(senderFeeBalanceBefore + fee/finney, senderFeeBalanceAfter,  "Seller didnt receieve sufficient fee");
    });


    xit("23. shouldnt cancel offer id2 when its already canceled", async() => {
      let offerId = 2;

      // contract main function calls
      try{
        let offerCanceled= await multiSend.cancelOffer(offerId, {from: sender});
        assert.fail();
      }catch(e){
        assert.equal(e.reason, "sender is not creator of offer");
      }
    });


    xit("24. shouldnt cancel offer id3 when sender not author", async() => {
      let offerId = 3;

      // contract main function calls
      try{
        let offerCanceled= await multiSend.cancelOffer(offerId, {from: receiver});
        assert.fail();
      } catch(e) {
         assert.equal(e.reason, "sender is not creator of offer");
       }
    });


    xit("25. shouldnt accept offer id3 when trade is disabled", async() => {
      let offerId = 3;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [receiverNftIdCount, receiverNftIdCount+1, "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      // contract main function calls
      try{
      let offerAccepted = await multiSend.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: receiver});
        receiverNftIdCount += requestedTokensAmount;
        assert.fail();
      }catch(e) {
         assert.equal(e.reason, "trade is disabled");
       }
    });


    xit("26. shouldnt accept offer id2 when offer has been canceled", async() => {
      let offerId = 2;
      let requestedTokensAmount = 1;
      let requestedTokenIds =  [receiverNftIdCount, receiverNftIdCount+1, "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      // configure the contract
      let tradeEnabled = await multiSend.enableTrade(true, {from: gameOwner});

      // contract main function calls
      try{
      let offerAccepted = await multiSend.acceptOffer(offerId, requestedTokensAmount, requestedTokenIds,
        requestedTokenAddresses, {from: receiver});
        receiverNftIdCount += requestedTokensAmount;
      assert.fail();
       }catch{
         assert(true);
       }

    });


    xit("27. shouldnt accept self-made offer id3", async() => {
      let offerId = 3;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [receiverNftIdCount, receiverNftIdCount+1, "0", "0", "0"];
      let requestedTokenAddresses = [
        nft.address,
        nft.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      // contract main function calls
      try{
      let offerAccepted = await multiSend.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: sender});
        receiverNftIdCount += requestedTokensAmount;
        assert.fail();
      }catch(e) {
         assert.equal(e.reason, "cant buy self-made offer");
       }
    });

    //IMPROVE: use the nft address at which receiver tokens actually exist
    xit("28. shouldnt accept offer id4 when requested token addresses dont match", async() => {
      let offerId = 4;
      let requestedTokenIds = [receiverNftIdCount, "0", "0", "0", "0"];
      let requestedTokenAddresses = [
        sampleERC20Token.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      ];

      // contract main function calls
      try{
      let offerAccepted = await multiSend.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: receiver}).catch(console.error);
        receiverNftIdCount += requestedTokensAmount;
        assert.fail();
      }catch(e) {
        assert(true);
         //assert.equal(e.reason, "wrong requested token address");
       }
    });


    xit("29. should accept offer id3", async() => {
      let offerId = 3;
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [receiverNftIdCount, receiverNftIdCount + 1, "0", "0", "0"];
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

      //check nft and bounty receiver balance before
      let receiverNftBalanceBefore = parseInt(await nft.balanceOf(receiver));
      let senderNftBalanceBefore = parseInt(await nft.balanceOf(sender));
      let receiverBountyBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(receiver))/finney);
      let contractCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(multiSend.address))/finney);

      // contract main function calls
      let offerAccepted = await multiSend.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: receiver}).catch(console.error);
      receiverNftIdCount+= requestedTokensAmount;

      //check nft and bounty receiver balance after. Check contracts crowns balance after
      let receiverNftBalanceAfter = parseInt(await nft.balanceOf(receiver));
      let senderNftBalanceAfter = parseInt(await nft.balanceOf(sender));
      let receiverBountyBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(receiver))/finney);
      let contractCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(multiSend.address))/finney);

      assert.equal(parseInt(receiverNftBalanceBefore) + offeredTokensAmount,
        parseInt(receiverNftBalanceAfter) + requestedTokensAmount, `receiver nft balances are incorrect`);
      assert.equal(parseInt(senderNftBalanceBefore) + requestedTokensAmount ,
        parseInt(senderNftBalanceAfter), `sender nft balances are incorrect`);
      assert.equal(receiverBountyBalanceBefore + bounty/finney, receiverBountyBalanceAfter,
        "Buyer didnt receieve sufficient bounty");
      assert.equal(contractCwsBalanceBefore, contractCwsBalanceAfter + fee/finney + bounty/finney,
        "Contract didnt spend fee amount of crowns");
    });


    xit("30. should accept offer id4", async() => {
      let offerId = 4;
      let offeredTokensAmount = 2;
      let requestedTokensAmount = 1;
      let requestedTokenIds = [receiverNftIdCount, "0", "0", "0", "0"];
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

      //check nft and bounty receiver balance before
      let receiverNftBalanceBefore = parseInt(await nft.balanceOf(receiver));
      let senderNftBalanceBefore = parseInt(await nft.balanceOf(sender));
      let receiverBountyBalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(receiver))/finney);
      let contractCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(multiSend.address))/finney);

      // contract main function calls
      let offerAccepted = await multiSend.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: receiver}).catch(console.error);
      receiverNftIdCount+= requestedTokensAmount;

      //check nft and bounty receiver balance after. Check contracts crowns balance after
      let receiverNftBalanceAfter = parseInt(await nft.balanceOf(receiver));
      let senderNftBalanceAfter = parseInt(await nft.balanceOf(sender));
      let receiverBountyBalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(receiver))/finney);
      let contractCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(multiSend.address))/finney);

      assert.equal(parseInt(receiverNftBalanceBefore) + offeredTokensAmount,
        parseInt(receiverNftBalanceAfter) + requestedTokensAmount, `receiver nft balances are incorrect`);
      assert.equal(parseInt(senderNftBalanceBefore) + requestedTokensAmount ,
        parseInt(senderNftBalanceAfter), `sender nft balances are incorrect`);
      assert.equal(receiverBountyBalanceBefore + bounty/finney, receiverBountyBalanceAfter,
        "Buyer didnt receieve sufficient bounty");
      assert.equal(contractCwsBalanceBefore, contractCwsBalanceAfter + fee/finney,
        "Contract didnt spend fee amount of crowns");
    });


    xit("31. shouldnt accept offer id3 when its already been accepted", async() => {
      let offerId = 3;
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [receiverNftIdCount, receiverNftIdCount + 1, "0", "0", "0"];
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
      let offerAccepted = await multiSend.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: receiver});
        receiverNftIdCount+= requestedTokensAmount;
        assert.fail();
      }catch(e) {
        assert(true);
         //assert.equal(e.reason, "wrong requested token address");
       }
    });


    xit("32. should accept offer id7", async() => {
      let offerId = 7;
      let offeredTokensAmount = 2;
      let requestedTokensAmount = 2;
      let requestedTokenIds = [receiverNftIdCount, receiverNftIdCount+1, "0", "0", "0"];
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

      //check nft and bounty receiver balance before
      let receiverNftBalanceBefore = parseInt(await nft.balanceOf(receiver));
      let senderNftBalanceBefore = parseInt(await nft.balanceOf(sender));
      let receiverBountyBalanceBefore = Math.floor(parseInt(await sampleERC20Token.balanceOf(receiver))/finney);
      let contractCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(multiSend.address))/finney);

      // contract main function calls
      let offerAccepted = await multiSend.acceptOffer(offerId, requestedTokensAmount,
        requestedTokenIds, requestedTokenAddresses, {from: receiver}).catch(console.error);
      receiverNftIdCount+= requestedTokensAmount;

      //check nft and bounty receiver balance after. Check contracts crowns balance after
      let receiverNftBalanceAfter = parseInt(await nft.balanceOf(receiver));
      let senderNftBalanceAfter = parseInt(await nft.balanceOf(sender));
      let receiverBountyBalanceAfter = Math.floor(parseInt(await sampleERC20Token.balanceOf(receiver))/finney);
      let contractCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(multiSend.address))/finney);

      assert.equal(parseInt(receiverNftBalanceBefore) + offeredTokensAmount,
        parseInt(receiverNftBalanceAfter) + requestedTokensAmount, `receiver nft balances are incorrect`);
      assert.equal(parseInt(senderNftBalanceBefore) + requestedTokensAmount ,
        parseInt(senderNftBalanceAfter), `sender nft balances are incorrect`);
      assert.equal(receiverBountyBalanceBefore + bounty/finney, receiverBountyBalanceAfter,
        "Buyer didnt receieve sufficient bounty");
      assert.equal(contractCwsBalanceBefore, contractCwsBalanceAfter + fee/finney,
        "Contract didnt spend fee amount of crowns");
    });



});
