let SwapSigner = artifacts.require("./SwapSigner.sol");
let NftSwap = artifacts.require("./NftSwap.sol");

let Crowns = artifacts.require("./CrownsToken.sol");
// let Mscp = artifacts.require("./MscpToken.sol");

let Scapes = artifacts.require("./SeascapeNft.sol");
let ScapesFactory = artifacts.require("./NftFactory.sol");
let ScapeSwapParams = artifacts.require("./swap_params/ScapeSwapParams.sol");

// let Cities = artifacts.require("./CityNft.sol");
// let CityFactory = artifacts.require("./CityFactory.sol");
// let CitySwapParams = artifacts.require("./swap_params/CitySwapParams.sol");

// let Boats = artifacts.require("./riverboat/RiverboatNft.sol");
// let BoatsFactory = artifacts.require("./../riverboat/RiverboatFactory.sol");
// let BoatsSwapParams = artifacts.require("./swap_params/RiverboatSwapParams.sol");

//
// let LighthouseSwapParams = artifacts.require("./swap_params/LighthouseSwapParams.sol");
//
// let Seascape = require("seascape");

contract("Nft Swap", async accounts => {

  // --------------------------------------------------
  // Digital signature
  // --------------------------------------------------

    // Accept offer

    async function encodeNfts(offerId, requestedTokensAmount, requestedTokenIds, requestedTokenAddresses){
      let v = ["0", "0", "0", "0", "0"];
      let r = ["0x00","0x00","0x00","0x00","0x00"];
      let s = ["0x00","0x00","0x00","0x00","0x00"];

      for(let i = 0; i < requestedTokensAmount; i++){
        let sig = await encodeRequestedNft(offerId, requestedTokenIds[i], requestedTokenAddresses[i]);
        v[i] = sig[0];
        r[i] = sig[1];
        s[i] = sig[2];
      }
      return [v, r, s];
    }

    async function encodeRequestedNft(_offerId, _tokenId, _tokenAddress){

      /// TODO add msg.sender address
      let uints = web3.eth.abi.encodeParameters(
        ["uint256", "uint256"], [_offerId, _tokenId]);

      // str needs to start with "0x"
      let str = uints + _tokenAddress.substr(2) + buyer.substr(2);
      let message = web3.utils.keccak256(str);
      let hash = await web3.eth.sign(message, owner);

      let r = hash.substr(0,66);
      let s = "0x" + hash.substr(66,64);
      let v = parseInt(hash.substr(130), 16);
      if (v < 27) {
          v += 27;
      }

      return [v, r, s];
    }

    // Scapes Create offer

    async function signScapes(requestedTokensAmount, offerId, requestedTokenParams){

      for(let i = 0; i < requestedTokensAmount; i++){

        let encodedData = encodeScape(requestedTokenParams[i][1],
          requestedTokenParams[i][2], requestedTokenParams[i][3]);

        let sig = await signParams(offerId, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }
    };

    function encodeScape(_imgId, _gen, _quality) {
      let bytes32 = web3.eth.abi.encodeParameters(
        ["uint256", "uint256", "uint8"], [_imgId, _gen, _quality]);
      return bytes32;
    }

    // Cities Create offer

    async function signCities(requestedTokensAmount, offerId, requestedTokenParams){

      for(let i = 0; i < requestedTokensAmount; i++){

        let encodedData = encodeCity(requestedTokenParams[i][0], requestedTokenParams[i][1]);

        let sig = await signParams(offerId, encodedData);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }
    };

    function encodeCity(_nftId, _category) {
      let bytes32 = web3.eth.abi.encodeParameters(
      ["uint256", "uint8"], [_nftId, _category]);
      return bytes32;
    }

    // Lighthouse Create Offer

    async function signLighthouses(requestedTokensAmount, offerId, requestedTokenParams){
    let encodedData = "0x0000000000000000000000000000000000000000000000000000000000000000";

      for(let i = 0; i < requestedTokensAmount; i++){

        let sig = await signOffer(offerId);

        requestedTokensArray[i] = [requestedTokenParams[i][0], encodedData, sig[0], sig[1], sig[2]];
      }
    };

    async function signOffer(offerId){
      let bytes32 = web3.eth.abi.encodeParameters(
        ["uint256"], [offerId]);

      let data = web3.utils.keccak256(bytes32);
      let hash = await web3.eth.sign(data, owner);

      let r = hash.substr(0,66);
      let s = "0x" + hash.substr(66,64);
      let v = parseInt(hash.substr(130), 16);
      if (v < 27) {
          v += 27;
      }

      return [v, r, s];
    }


    // For all Create offers

    async function signParams(offerId, bytes){
      let bytes32 = web3.eth.abi.encodeParameters(
        ["uint256"], [offerId]);

      let data = web3.utils.keccak256(bytes32 + bytes.substr(2));
      let hash = await web3.eth.sign(data, owner);

      let r = hash.substr(0,66);
      let s = "0x" + hash.substr(66,64);
      let v = parseInt(hash.substr(130), 16);
      if (v < 27) {
          v += 27;
      }

      return [v, r, s];
    }



    // --------------------------------------------------
    // Global variables
    // --------------------------------------------------

    let price = web3.utils.toWei("2", "ether");
    let offersAmount = 0;
    let ether = 1000000000000000000;
    let fee = web3.utils.toWei("1", "ether");

    // contract instances
    let swapSigner = null;
    let nftSwap = null;

    let crowns = null;
    let mscp = null;

    let scapes = null;
    let factory = null;
    let scapeSwapParams = null;

    let cities = null;
    let cityFactory = null;
    let citySwapParams = null;

    let boats = null;
    let boatsFactory = null;
    let boatsSwapParams = null;

    let lighthouseSwapParams = null;

    //accounts
    let owner = null;
    let seller = null;
    let buyer = null;

    // --------------------------------------------------
    // Global objects
    // --------------------------------------------------

    let offeredTokensArray = [
      // NOTE EVM requires proper formating even for empty slots
      // structure: [nftId, nftAddress]
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
    ];

    let requestedTokensArray = [
      // NOTE EVM requires proper formating even for empty slots
      //structure: [tokenAddress, imgId, generation, quality]
      ["0x0000000000000000000000000000000000000000", "0x00", "0", "0x00", "0x00"],
      ["0x0000000000000000000000000000000000000000", "0x00", "0", "0x00", "0x00"],
      ["0x0000000000000000000000000000000000000000", "0x00", "0", "0x00", "0x00"],
      ["0x0000000000000000000000000000000000000000", "0x00", "0", "0x00", "0x00"],
      ["0x0000000000000000000000000000000000000000", "0x00", "0", "0x00", "0x00"],
    ];

    let requestedTokensAddresses = [
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000"
    ];

    // --------------------------------------------------
    // Global functions
    // --------------------------------------------------

    async function approveCoins(coin, amount, spender, owner){
      await coin.approve(spender, amount, {from: owner});
      let allowance = await coin.allowance(owner, spender);
      assert.equal(allowance, amount, "not enough coins allowed to be spent");
    }

    async function getNftBalance(token, owner){
      try{
        let balance = await token.balanceOf(owner);
        return parseInt(balance);
      }catch(e){
        return "invalid value";
      }
    };

    async function getCoinsBalance(coin, owner){
      try{
        let balance = await coin.balanceOf(owner);
        balance = Math.floor(parseInt(balance)/ether);
        return parseInt(balance);
      }catch(e){
        return "invalid value";
      }
    };

    async function getTokenIds(user, token, tokensAmount){

      let tokenIds = [0, 0, 0, 0, 0];
      for(let index = 0; index < tokensAmount; index++){
        let tokenId = await token.tokenOfOwnerByIndex(user, index);
        tokenIds[index] = parseInt(tokenId);
      }
      return tokenIds;
    }

    async function getLastOfferId(){
      let offerId = await nftSwap.getLastOfferId();
      return parseInt(offerId);
    }

    function setOfferedTokensArray(offeredTokensAmount, tokenIds, offeredTokenAddress){
      for(let i=0; i<offeredTokensAmount; i++){
        offeredTokensArray[i][0]=tokenIds[i];
        offeredTokensArray[i][1]=offeredTokenAddress;
      }
    }

    function setRequestedTokensArray(requestedTokensAmount, requestedTokenAddress){
	    for(let i=0; i<requestedTokensAmount; i++){
    	  requestedTokensArray[i][0]=requestedTokenAddress;
      }
    }

    function setRequestedTokensAddresses(requestedTokensAmount, requestedTokenAddress){
      for(let i=0; i<requestedTokensAmount; i++){
        requestedTokensAddresses[i]=requestedTokenAddress;
      }
    }

    // --------------------------------------------------
    // Initialization tests
    // --------------------------------------------------

    it("link required contracts", async () => {
       swapSigner = await SwapSigner.deployed();
	     nftSwap = await NftSwap.deployed();

       crowns = await Crowns.deployed();
       // mscp = await Mscp.deployed();

       scapes = await  Scapes.deployed();
       factory = await  ScapesFactory.deployed();
       scapeSwapParams =  await ScapeSwapParams.deployed();

       // cities = await Cities.deployed();
       // cityFactory = await CityFactory.deployed();
       // citySwapParams = await CitySwapParams.deployed();

       // boats = await Boats.deployed();
       // boatsFactory = await BoatsFactory.deployed();
       // boatsSwapParams = await BoatsSwapParams.deployed();

       // lighthouseSwapParams = await LighthouseSwapParams.deployed();

       //initialize accounts
	     owner = accounts[0];
       seller = accounts[1];
       buyer = accounts[2];
    });

    it("set scape factory and add generator", async () => {
      await scapes.setFactory(factory.address).catch(console.error); //same as setMinter
      await factory.addGenerator(owner, {from: owner}).catch(console.error);

      let isGenerator = await factory.isGenerator(owner).catch(console.error);
      assert.equal(isGenerator, true, `owner should be given a role of generator`);
    });

    xit("set city factory and add generator", async () => {
      await cities.setMinter(cityFactory.address).catch(console.error); //same as setMinter
      await cityFactory.addStaticUser(owner, {from: owner}).catch(console.error);

      let isStaticUser = await cityFactory.isStaticUser(owner).catch(console.error);
      assert.equal(isStaticUser, true, `owner should be given a role of static user`);
    });

    xit("set boat factory and add generator", async () => {
      await boats.setFactory(boatsFactory.address).catch(console.error); //same as setMinter
      await boatsFactory.addGenerator(owner, {from: owner}).catch(console.error);

      let isGenerator = await boatsFactory.isGenerator(owner).catch(console.error);
      assert.equal(isGenerator, true, `owner should be given a role of generator`);
    });

    it("mint scapes", async () => {
      const amountToMint = {
        seller: 1, //9
        buyer: 1,   //5
      };

      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let scapesBeforeBuyer = await getNftBalance(scapes, buyer);

      await mintScapes();

      let scapesAfterSeller = await getNftBalance(scapes, seller);
      let scapesAftereBuyer = await getNftBalance(scapes, buyer);

      assert.equal(scapesAfterSeller, scapesBeforeSeller + amountToMint.seller,
        `${amountToMint.seller} scapes should be minted for seller`);
      assert.equal(scapesAftereBuyer, scapesBeforeBuyer + amountToMint.buyer,
        `${amountToMint.buyer} scapes should be minted for buyer`);

      // --------------------------------------------------
      // Internal functions
      // --------------------------------------------------

      async function mintScapes(){
        let generation = 0;
        let quality = 1;

        for(var i = 0; i < amountToMint.seller; i++){
          await factory.mintQuality(seller, generation, quality, {from: owner}).catch(console.error);
        }
        for(var i = 0; i < amountToMint.buyer; i++){
          await factory.mintQuality(buyer, generation, quality, {from: owner}).catch(console.error);
        }
      }

    });

    xit("mint cities", async () => {
      const amountToMint = {
        seller: 1, //9
        buyer: 1,   //5
      };

      let citiesBeforeSeller = await getNftBalance(cities, seller);
      let citiesBeforeBuyer = await getNftBalance(cities, buyer);

      await mintCities();

      let citiesAfterSeller = await getNftBalance(cities, seller);
      let citiesAftereBuyer = await getNftBalance(cities, buyer);

      assert.equal(citiesAfterSeller, citiesBeforeSeller + amountToMint.seller,
        `${amountToMint.seller} cities should be minted for seller`);
      assert.equal(citiesAftereBuyer, citiesBeforeBuyer + amountToMint.buyer,
        `${amountToMint.buyer} cities should be minted for buyer`);

      // --------------------------------------------------
      // Internal functions
      // --------------------------------------------------

      async function mintCities(){
        let category = 1;
        let tokenId = 1;
        while(tokenId <= amountToMint.seller){
          await cityFactory.mint(tokenId, category, seller).catch(console.error);
          tokenId++;
        }

        while(tokenId <= amountToMint.seller + amountToMint.buyer){
          await cityFactory.mint(tokenId, category, buyer).catch(console.error);
          tokenId++;
        }
      }

    });

    xit("mint boats", async () => {
      const amountToMint = {
        seller: 0, //9
        buyer: 1,   //5
      };

      let boatsBeforeSeller = await getNftBalance(boats, seller);
      let boatsBeforeBuyer = await getNftBalance(boats, buyer);

      await mintBoats();

      let boatsAfterSeller = await getNftBalance(boats, seller);
      let boatsAftereBuyer = await getNftBalance(boats, buyer);

      assert.equal(boatsAfterSeller, boatsBeforeSeller + amountToMint.seller,
        `${amountToMint.seller} boats should be minted for seller`);
      assert.equal(boatsAftereBuyer, boatsBeforeBuyer + amountToMint.buyer,
        `${amountToMint.buyer} boats should be minted for buyer`);

      // --------------------------------------------------
      // Internal functions
      // --------------------------------------------------

      async function mintBoats(){
        let type = 1;

        for(var i = 0; i < amountToMint.seller; i++){
          await boatsFactory.mintType(seller, type, {from: owner}).catch(console.error);
        }
        for(var i = 0; i < amountToMint.buyer; i++){
          await boatsFactory.mintType(buyer, type, {from: owner}).catch(console.error);
        }
      }

    });

    it("approve scapes", async () => {
      await scapes.setApprovalForAll(nftSwap.address, true, {from: seller}).catch(console.error);
      await scapes.setApprovalForAll(nftSwap.address, true, {from: buyer}).catch(console.error);

      let buyerIsApproved = await scapes.isApprovedForAll(buyer, nftSwap.address);
      let sellerIsApproved = await scapes.isApprovedForAll(seller, nftSwap.address);

      assert.equal(buyerIsApproved, true, "buyers tokens are not approved");
      assert.equal(sellerIsApproved, true, "seller tokens are not approved");
    });

    xit("approve cities", async () => {
      await cities.setApprovalForAll(nftSwap.address, true, {from: seller}).catch(console.error);
      await cities.setApprovalForAll(nftSwap.address, true, {from: buyer}).catch(console.error);

      let buyerIsApproved = await cities.isApprovedForAll(buyer, nftSwap.address);
      let sellerIsApproved = await cities.isApprovedForAll(seller, nftSwap.address);

      assert.equal(buyerIsApproved, true, "buyers tokens are not approved");
      assert.equal(sellerIsApproved, true, "seller tokens are not approved");
    });

    xit("approve boats", async () => {
      await boats.setApprovalForAll(nftSwap.address, true, {from: seller}).catch(console.error);
      await boats.setApprovalForAll(nftSwap.address, true, {from: buyer}).catch(console.error);

      let buyerIsApproved = await boats.isApprovedForAll(buyer, nftSwap.address);
      let sellerIsApproved = await boats.isApprovedForAll(seller, nftSwap.address);

      assert.equal(buyerIsApproved, true, "buyers tokens are not approved");
      assert.equal(sellerIsApproved, true, "seller tokens are not approved");
    });

    it("mint crowns", async () => {

      let amountToMint = web3.utils.toWei("100", "ether");

      let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/ether);

      await crowns.transfer(seller, amountToMint, {from: owner});

      let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/ether);

      assert.equal(sellerCwsBalanceBefore+ amountToMint/ether, sellerCwsBalanceAfter,
        "Seller didnt receive enough coins");
    });

    xit("mint mscp", async () => {

      let amountToMint = web3.utils.toWei("100", "ether");

      let sellerMscpBefore = Math.floor(parseInt(await mscp.balanceOf(seller))/ether);

      await mscp.transfer(seller, amountToMint, {from: owner});

      let sellerMscpAfter = Math.floor(parseInt(await mscp.balanceOf(seller))/ether);

      assert.equal(sellerMscpBefore+ amountToMint/ether, sellerMscpAfter,
        "Seller didnt receive enough coins");
    });

    xit("enable trade", async () => {
      await nftSwap.enableTrade(true, {from: owner}).catch(console.error);

      let tradeEnabled = await nftSwap.tradeEnabled.call();

      assert.equal(tradeEnabled, true, "trade not enabled");
    });

    xit("add mscp bounty address", async () => {
      let bountyAddress = mscp.address;

      await nftSwap.addSupportedBountyAddress(bountyAddress, {from: owner})
        .catch(console.error);

      let isBountySupported = await nftSwap.supportedBountyAddresses(bountyAddress);

      assert.equal(isBountySupported, true, "bounty address not added");
    });

    it("add native bounty address", async () => {
      let bountyAddress = "0x0000000000000000000000000000000000000000";

      await nftSwap.addSupportedBountyAddress(bountyAddress, {from: owner})
        .catch(console.error);

      let isBountySupported = await nftSwap.supportedBountyAddresses(bountyAddress);

      assert.equal(isBountySupported, true, "bounty address not added");
    });

    it("enable scapes", async () => {
      // configure the contract
      await nftSwap.enableSupportedNftAddress(scapes.address, scapeSwapParams.address,
        {from: owner}).catch(console.error);

      let scapesAddressAdded = await nftSwap.supportedNftAddresses(scapes.address);

      assert.equal(scapesAddressAdded, scapeSwapParams.address, "scapes address not added");
    });

    xit("enable cities", async () => {
      // configure the contract
      await nftSwap.enableSupportedNftAddress(cities.address, citySwapParams.address,
        {from: owner}).catch(console.error);

      let cityAddressAdded = await nftSwap.supportedNftAddresses(cities.address);

      assert.equal(cityAddressAdded, citySwapParams.address, "cities address not added");
    });

    xit("enable boats", async () => {
      // configure the contract
      await nftSwap.enableSupportedNftAddress(boats.address, boatsSwapParams.address,
        {from: owner}).catch(console.error);

      let boatsAddressAdded = await nftSwap.supportedNftAddresses(boats.address);

      assert.equal(boatsAddressAdded, boatsSwapParams.address, "boats address not added");
    });

    xit("SwapSigner returns signer", async() => {

      let signer = await swapSigner.getSigner().catch(console.error);

       assert.equal(signer, owner, `invalid signer`);
    });

    xit("able to set signer", async() => {

       let newSigner = buyer;

       await swapSigner.setSigner(newSigner).catch(console.error);

       let signer = await swapSigner.getSigner().catch(console.error);

        assert.equal(signer, newSigner, `signature invalid`);
    });

    it("verify scapes offer", async() => {
      // parameters setup
      let offerId = await getLastOfferId();
      let requestedTokensAmount = 1;
      let requestedTokenParams = [
        //structure: [tokenAddress, imgId, generation, quality]
        [scapes.address, "24", "0", "4"],
        [null], [null], [null], [null]
      ];

      await signScapes(requestedTokensAmount, offerId, requestedTokenParams);

      let signatureValid = await scapeSwapParams.paramsAreValid(offerId, requestedTokensArray[0][1], requestedTokensArray[0][2],
        requestedTokensArray[0][3], requestedTokensArray[0][4], {from: seller}).catch(console.error);

       assert.equal(signatureValid, true, `signature invalid`);
    });

    xit("verify cities offer", async() => {
      // parameters setup
      let offerId = await getLastOfferId();
      let requestedTokensAmount = 1;
      let requestedTokenParams = [
        //structure: [tokenAddress, nftId, category]
        ["26", "3"],
        [null], [null], [null], [null]
      ];

      await signCities(requestedTokensAmount, offerId, requestedTokenParams);

      let signatureValid = await citySwapParams.paramsAreValid(offerId, requestedTokensArray[0][1], requestedTokensArray[0][2],
        requestedTokensArray[0][3], requestedTokensArray[0][4], {from: seller}).catch(console.error);

       assert.equal(signatureValid, true, `signature invalid`);
    });

    xit("verify boats offer", async() => {
      // parameters setup
      let offerId = await getLastOfferId();
      let requestedTokensAmount = 1;
      let requestedTokenParams = [
        //structure: [tokenAddress, nftId, category]
        ["26", "3"],
        [null], [null], [null], [null]
      ];

      await signCities(requestedTokensAmount, offerId, requestedTokenParams);

      let signatureValid = await boatsSwapParams.paramsAreValid(offerId, requestedTokensArray[0][1], requestedTokensArray[0][2],
        requestedTokensArray[0][3], requestedTokensArray[0][4], {from: seller}).catch(console.error);

       assert.equal(signatureValid, true, `signature invalid`);
    });

    xit("verify lighthouses offer", async() => {
      // parameters setup
      let offerId = await getLastOfferId();
      let requestedTokensAmount = 1;
      let requestedTokenParams = [
        [], [], [], [],
      ];

      await signLighthouses(requestedTokensAmount, offerId, requestedTokenParams);

      let signatureValid = await lighthouseSwapParams.paramsAreValid(offerId, requestedTokensArray[0][1], requestedTokensArray[0][2],
        requestedTokensArray[0][3], requestedTokensArray[0][4], {from: seller}).catch(console.error);

       assert.equal(signatureValid, true, `signature invalid`);
    });

    xit("verify zombies offer", async() => {
      //structure: [tokenAddress, nftId, category]
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let requestedTokenParams = [
        [], [], [], [],
      ];

      await signZombies(requestedTokensAmount, offerId, requestedTokenParams);

      let signatureValid = await lighthouseSwapParams.paramsAreValid(offerId, requestedTokensArray[0][1], requestedTokensArray[0][2],
        requestedTokensArray[0][3], requestedTokensArray[0][4], {from: seller}).catch(console.error);

       assert.equal(signatureValid, true, `signature invalid`);
    });

    it("create scapes offer", async() => {
      // parameters setup
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;
      let offeredTokenAddress = scapes.address;
      let requestedTokenAddress = scapes.address;
      let offeredTokenIds = await getTokenIds(seller, scapes, offeredTokensAmount);
      let requestedTokenParams = [
        //structure: [tokenAddress, imgId, generation, quality]
        [scapes.address, "24", "0", "4"],
        [null], [null], [null], [null]
      ];

      setOfferedTokensArray(offeredTokensAmount, offeredTokenIds, offeredTokenAddress)
      setRequestedTokensArray(requestedTokensAmount, requestedTokenAddress);

      await signScapes(requestedTokensAmount, offerId, requestedTokenParams);

      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let crownsBeforeSeller = await getCoinsBalance(crowns, seller);

      // contract calls
      //structure: (coin, amount, spender, owner)
      await approveCoins(crowns, fee+bounty, nftSwap.address, seller);

      await nftSwap.createOffer(offeredTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: seller}).catch(console.error);

       let scapesAfterSeller = await getNftBalance(scapes, seller);
       let crownsAfterSeller = await getCoinsBalance(crowns, seller);

       assert.equal(scapesAfterSeller + offeredTokensAmount, scapesBeforeSeller,
         `${offeredTokensAmount} tokens should be taken from seller`);
       assert.equal(crownsBeforeSeller, crownsAfterSeller + fee/ether + bounty/ether,
         "Seller didnt pay enough fee");
    });

    xit("create scapes offer with riverboat requested nft", async() => {
      // parameters setup
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokenAddress = scapes.address;
      let requestedTokenAddress = boats.address;
      let offeredTokenIds = await getTokenIds(seller, scapes, offeredTokensAmount);
      let requestedTokenParams = [
        //structure: [tokenAddress, nftId, category]
        [boats.address, "24", "3"],
        [null], [null], [null], [null]
      ];

      setOfferedTokensArray(offeredTokensAmount, offeredTokenIds, offeredTokenAddress)
      setRequestedTokensArray(requestedTokensAmount, requestedTokenAddress);

      await signCities(requestedTokensAmount, offerId, requestedTokenParams);

      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let crownsBeforeSeller = await getCoinsBalance(crowns, seller);

      // contract calls
      //structure: (coin, amount, spender, owner)
      await approveCoins(crowns, fee+bounty, nftSwap.address, seller);

      await nftSwap.createOffer(offeredTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: seller}).catch(console.error);

       let scapesAfterSeller = await getNftBalance(scapes, seller);
       let crownsAfterSeller = await getCoinsBalance(crowns, seller);

       assert.equal(scapesAfterSeller + offeredTokensAmount, scapesBeforeSeller,
         `${offeredTokensAmount} tokens should be taken from seller`);
       assert.equal(crownsBeforeSeller, crownsAfterSeller + fee/ether + bounty/ether,
         "Seller didnt pay enough fee");
    });

    xit("accept scapes offer", async() => {
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let requestedTokenIds = await getTokenIds(buyer, scapes, requestedTokensAmount);
      let bounty = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;

      // structure: (requestedTokensAmount, requestedTokenAddress)
      setRequestedTokensAddresses(requestedTokensAmount, scapes.address);

      let sig = await encodeNfts(offerId, requestedTokensAmount, requestedTokenIds, requestedTokensAddresses);

      //check nft and bounty buyer balance before
      let scapesBeforeBuyer = await getNftBalance(scapes, buyer);
      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let crownsBeforeContract = await getCoinsBalance(crowns, nftSwap.address);

      // contract calls
      await nftSwap.acceptOffer(offerId, requestedTokenIds, requestedTokensAddresses,
        sig[0], sig[1], sig[2], {from: buyer}).catch(console.error);

      //check nft and bounty buyer balance after. Check contracts crowns balance after
      let scapesAfterBuyer = await getNftBalance(scapes, buyer);
      let scapesAfterSeller = await getNftBalance(scapes, seller);
      let crownsAfterContract = await getCoinsBalance(crowns, nftSwap.address);

      assert.equal(scapesBeforeBuyer + offeredTokensAmount, scapesAfterBuyer + requestedTokensAmount,
        `buyer nft balances are incorrect`);
      assert.equal(scapesBeforeSeller + requestedTokensAmount, scapesAfterSeller,
        `seller nft balances are incorrect`);
        assert.equal(crownsBeforeContract, crownsAfterContract + fee/ether + bounty/ether,
          "contract didnt burn enough fee");
    });

    it("cancel scapes offer", async() => {
      let offerId = await getLastOfferId();
      let offerTokensAmount = 1;
      let bounty = web3.utils.toWei("1", "ether");
      let fee = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;

      //check nft and bounty buyer balance before
      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let crownsBeforeSeller = await getCoinsBalance(crowns, seller);

      //main contract calls
      await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);

      //check nft, fee and bounty seller balance after
      let scapesAfterSeller = await getNftBalance(scapes, seller);
      let crownsAfterSeller = await getCoinsBalance(crowns, seller);

      assert.equal(scapesBeforeSeller + offerTokensAmount, scapesAfterSeller,
        `${offerTokensAmount} tokens should be returned to seller`);
      assert.equal(crownsBeforeSeller + bounty/ether +fee/ether, crownsAfterSeller,
        "seller didnt receive sufficient fee");
    });

    xit("create scapes offer with mscp bounty", async() => {
      // parameters setup
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("1", "ether");
      let bountyAddress = mscp.address;
      let offeredTokenAddress = scapes.address;
      let requestedTokenAddress = scapes.address;
      let offeredTokenIds = await getTokenIds(seller, scapes, offeredTokensAmount);
      let requestedTokenParams = [
        //structure: [tokenAddress, imgId, generation, quality]
        [offeredTokenAddress, "24", "0", "4"],
        [null], [null], [null], [null]
      ];

      setOfferedTokensArray(offeredTokensAmount, offeredTokenIds, offeredTokenAddress)
      setRequestedTokensArray(requestedTokensAmount, requestedTokenAddress);

      await signScapes(requestedTokensAmount, offerId, requestedTokenParams);

      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let crownsBeforeSeller = await getCoinsBalance(crowns, seller);
      let mscpBeforeSeller = await getCoinsBalance(mscp, seller);

      // contract calls
      //structure: (coin, amount, spender, owner)
      await approveCoins(crowns, fee, nftSwap.address, seller);
      await approveCoins(mscp, bounty, nftSwap.address, seller);

      await nftSwap.createOffer(offeredTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: seller}).catch(console.error);

       let scapesAfterSeller = await getNftBalance(scapes, seller);
       let crownsAfterSeller = await getCoinsBalance(crowns, seller);
       let mscpAfterSeller = await getCoinsBalance(mscp, seller);

       assert.equal(scapesAfterSeller + offeredTokensAmount, scapesBeforeSeller,
         `${offeredTokensAmount} tokens should be taken from seller`);
       assert.equal(crownsBeforeSeller, crownsAfterSeller + fee/ether,
         "Seller didnt pay enough fee");
       assert.equal(mscpBeforeSeller, mscpAfterSeller + bounty/ether,
         "Seller didnt pay enough bounty");
    });

    xit("accept scapes offer with mscp bounty", async() => {
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let requestedTokenIds = await getTokenIds(buyer, scapes, requestedTokensAmount);
      let bounty = web3.utils.toWei("1", "ether");
      let bountyAddress = mscp.address;

      // structure: (requestedTokensAmount, requestedTokenAddress)
      setRequestedTokensAddresses(requestedTokensAmount, scapes.address);

      let sig = await encodeNfts(offerId, requestedTokensAmount, requestedTokenIds, requestedTokensAddresses);

      //check nft and bounty buyer balance before
      let scapesBeforeBuyer = await getNftBalance(scapes, buyer);
      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let crownsBeforeContract = await getCoinsBalance(crowns, nftSwap.address);
      let mscpBeforeBuyer = await getCoinsBalance(mscp, buyer);


      // contract calls
      await nftSwap.acceptOffer(offerId, requestedTokenIds, requestedTokensAddresses,
        sig[0], sig[1], sig[2], {from: buyer}).catch(console.error);

      //check nft and bounty buyer balance after. Check contracts crowns balance after
      let scapesAfterBuyer = await getNftBalance(scapes, buyer);
      let scapesAfterSeller = await getNftBalance(scapes, seller);
      let crownsAfterContract = await getCoinsBalance(crowns, nftSwap.address);
      let mscpAfterBuyer = await getCoinsBalance(mscp, buyer);

      assert.equal(scapesBeforeBuyer + offeredTokensAmount, scapesAfterBuyer + requestedTokensAmount,
        `buyer nft balances are incorrect`);
      assert.equal(scapesBeforeSeller + requestedTokensAmount, scapesAfterSeller,
        `seller nft balances are incorrect`);
      assert.equal(crownsBeforeContract, crownsAfterContract + fee/ether,
        "contract didnt burn enough fee");
      assert.equal(mscpBeforeBuyer + bounty/ether, mscpAfterBuyer,
        "buyer received insufficient bounty");
    });

    xit("cancel scapes offer with mscp bounty", async() => {
      let offerId = await getLastOfferId();
      let offerTokensAmount = 1;
      let bounty = web3.utils.toWei("1", "ether");
      let fee = web3.utils.toWei("1", "ether");
      let bountyAddress = crowns.address;

      //check nft and bounty buyer balance before
      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let crownsBeforeSeller = await getCoinsBalance(crowns, seller);
      let mscpBeforeSeller = await getCoinsBalance(mscp, seller);

      //main contract calls
      await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);

      //check nft, fee and bounty seller balance after
      let scapesAfterSeller = await getNftBalance(scapes, seller);
      let crownsAfterSeller = await getCoinsBalance(crowns, seller);
      let mscpAfterSeller = await getCoinsBalance(mscp, seller);

      assert.equal(scapesBeforeSeller + offerTokensAmount, scapesAfterSeller,
        `${offerTokensAmount} tokens should be returned to seller`);
      assert.equal(crownsBeforeSeller +fee/ether, crownsAfterSeller,
        "seller didnt receive sufficient fee");
      assert.equal(mscpBeforeSeller + bounty/ether, mscpAfterSeller,
        "seller received insufficient bounty");
    });

    it("create scapes offer with native bounty", async() => {
      // parameters setup
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("1.5", "ether");
      let bountyAddress = "0x0000000000000000000000000000000000000000";
      let offeredTokenAddress = scapes.address;
      let requestedTokenAddress = scapes.address;
      let offeredTokenIds = await getTokenIds(seller, scapes, offeredTokensAmount);
      let requestedTokenParams = [
        //structure: [tokenAddress, imgId, generation, quality]
        [offeredTokenAddress, "24", "0", "4"],
        [null], [null], [null], [null]
      ];

      setOfferedTokensArray(offeredTokensAmount, offeredTokenIds, offeredTokenAddress)
      setRequestedTokensArray(requestedTokensAmount, requestedTokenAddress);

      await signScapes(requestedTokensAmount, offerId, requestedTokenParams);

      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let crownsBeforeSeller = await getCoinsBalance(crowns, seller);
      let ethersBeforeContract = await web3.eth.getBalance(nftSwap.address)/ether;

      // contract calls
      //structure: (coin, amount, spender, owner)
      await approveCoins(crowns, fee, nftSwap.address, seller);

      await nftSwap.createOffer(offeredTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: seller, value: bounty}).catch(console.error);

       let scapesAfterSeller = await getNftBalance(scapes, seller);
       let crownsAfterSeller = await getCoinsBalance(crowns, seller);
       let ethersAfterContract = await web3.eth.getBalance(nftSwap.address)/ether;

       assert.equal(scapesAfterSeller + offeredTokensAmount, scapesBeforeSeller,
         `${offeredTokensAmount} tokens should be taken from seller`);
       assert.equal(crownsBeforeSeller, crownsAfterSeller + fee/ether,
         "Seller didnt pay enough fee");
       assert.equal(ethersBeforeContract + bounty/ether, ethersAfterContract,
         "contract didnt receive enough bounty");
    });

    it("accept scapes offer with native bounty", async() => {
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let requestedTokenIds = await getTokenIds(buyer, scapes, requestedTokensAmount);
      let bounty = web3.utils.toWei("1.5", "ether");

      // structure: (requestedTokensAmount, requestedTokenAddress)
      setRequestedTokensAddresses(requestedTokensAmount, scapes.address);

      let sig = await encodeNfts(offerId, requestedTokensAmount, requestedTokenIds, requestedTokensAddresses);

      //check nft and bounty buyer balance before
      let scapesBeforeBuyer = await getNftBalance(scapes, buyer);
      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let ethersBeforeContract = await web3.eth.getBalance(nftSwap.address)/ether;

      // contract calls
      await nftSwap.acceptOffer(offerId, requestedTokenIds, requestedTokensAddresses,
        sig[0], sig[1], sig[2], {from: buyer}).catch(console.error);

      //check nft and bounty buyer balance after. Check contracts crowns balance after
      let scapesAfterBuyer = await getNftBalance(scapes, buyer);
      let scapesAfterSeller = await getNftBalance(scapes, seller);
      let ethersAfterContract = await web3.eth.getBalance(nftSwap.address)/ether;

      assert.equal(scapesBeforeBuyer + offeredTokensAmount, scapesAfterBuyer + requestedTokensAmount,
        `buyer nft balances are incorrect`);
      assert.equal(scapesBeforeSeller + requestedTokensAmount, scapesAfterSeller,
        `seller nft balances are incorrect`);
        assert.equal(ethersBeforeContract, ethersAfterContract + bounty/ether,
          "contract didnt send enough bounty");
    });

    xit("cancel scapes offer with native bounty", async() => {
      let offerId = await getLastOfferId();
      let offerTokensAmount = 1;
      let bounty = web3.utils.toWei("1.5", "ether");
      let fee = web3.utils.toWei("1", "ether");

      //check nft and bounty buyer balance before
      let scapesBeforeSeller = await getNftBalance(scapes, seller);
      let crownsBeforeSeller = await getCoinsBalance(crowns, seller);
      let ethersBeforeContract = await web3.eth.getBalance(nftSwap.address)/ether;

      //main contract calls
      await nftSwap.cancelOffer(offerId, {from: seller}).catch(console.error);

      //check nft, fee and bounty seller balance after
      let scapesAfterSeller = await getNftBalance(scapes, seller);
      let crownsAfterSeller = await getCoinsBalance(crowns, seller);
      let ethersAfterContract = await web3.eth.getBalance(nftSwap.address)/ether;

      assert.equal(scapesBeforeSeller + offerTokensAmount, scapesAfterSeller,
        `${offerTokensAmount} tokens should be returned to seller`);
      assert.equal(crownsBeforeSeller + fee/ether, crownsAfterSeller,
        "seller didnt receive sufficient fee");
      assert.equal(ethersBeforeContract, ethersAfterContract + bounty/ether,
        "contract didnt send enough bounty");
    });

    xit("create cities offer", async() => {
      // parameters setup
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;
      let offeredTokenAddress = cities.address;
      let requestedTokenAddress = cities.address;
      let offeredTokenIds = await getTokenIds(seller, cities, offeredTokensAmount);
      let requestedTokenParams = [
        //structure: [tokenAddress, nftId, category]
        [offeredTokenAddress, "26", "3"],
        [null], [null], [null], [null]
      ];

      setOfferedTokensArray(offeredTokensAmount, offeredTokenIds, offeredTokenAddress)
      setRequestedTokensArray(requestedTokensAmount, requestedTokenAddress);

      await signCities(requestedTokensAmount, offerId, requestedTokenParams);

      let citiesBeforeSeller = await getNftBalance(cities, seller);
      let crownsBeforeSeller = await getCoinsBalance(crowns, seller);

      // contract calls
      //structure: (coin, amount, spender, owner)
      await approveCoins(crowns, fee, nftSwap.address, seller);

      await nftSwap.createOffer(offeredTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: seller}).catch(console.error);

       let citiesAfterSeller = await getNftBalance(cities, seller);
       let crownsAfterSeller = await getCoinsBalance(crowns, seller);

       assert.equal(citiesAfterSeller + offeredTokensAmount, citiesBeforeSeller,
         `${offeredTokensAmount} tokens should be taken from seller`);
       assert.equal(crownsBeforeSeller, crownsAfterSeller + fee/ether,
         "Seller didnt pay enough fee");
    });

    xit("accept cities offer", async() => {
      let offerId = await getLastOfferId();
      let offeredTokensAmount = 1;
      let requestedTokensAmount = 1;
      let requestedTokenIds = await getTokenIds(buyer, cities, requestedTokensAmount);
      let bounty = web3.utils.toWei("0", "ether");
      let bountyAddress = crowns.address;

      // structure: (requestedTokensAmount, requestedTokenAddress)
      setRequestedTokensAddresses(requestedTokensAmount, cities.address);

      let sig = await encodeNfts(offerId, requestedTokensAmount, requestedTokenIds, requestedTokensAddresses);

      //check nft and bounty buyer balance before
      let citiesBeforeBuyer = await getNftBalance(cities, buyer);
      let citiesBeforeSeller = await getNftBalance(cities, seller);
      let crownsBeforeContract = await getCoinsBalance(crowns, nftSwap.address);

      // contract calls
      await nftSwap.acceptOffer(offerId, requestedTokenIds, requestedTokensAddresses,
        sig[0], sig[1], sig[2], {from: buyer}).catch(console.error);

      //check nft and bounty buyer balance after. Check contracts crowns balance after
      let citiesAfterBuyer = await getNftBalance(cities, buyer);
      let citiesAfterSeller = await getNftBalance(cities, seller);
      let crownsAfterContract = await getCoinsBalance(crowns, nftSwap.address);

      assert.equal(citiesBeforeBuyer + offeredTokensAmount, citiesAfterBuyer + requestedTokensAmount,
        `buyer nft balances are incorrect`);
      assert.equal(citiesBeforeSeller + requestedTokensAmount, citiesAfterSeller,
        `seller nft balances are incorrect`);
      assert.equal(crownsBeforeContract, crownsAfterContract + fee/ether + bounty/ether,
        "Contract didnt spend fee amount of crowns");
    });

});
