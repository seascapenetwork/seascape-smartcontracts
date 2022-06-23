let BundleOffer = artifacts.require("./BundleOffer.sol");

let Crowns = artifacts.require("./CrownsToken.sol");
let Scapes = artifacts.require("./SeascapeNft.sol");
let ScapesFactory = artifacts.require("./NftFactory.sol");



contract("Bundle Offer", async accounts => {

  // --------------------------------------------------
  // Global variables
  // --------------------------------------------------

  // scalers
  let ether = 1000000000000000000;

  // contracts
  let scapes = null;
  let factory = null;
  let bundleOffer = null;

  // EOAs
  let owner = null;
  let seller = null;
  let buyer = null;

  // --------------------------------------------------
  // Global functions
  // --------------------------------------------------

  async function approveERC20(token, amount, spender, owner){
    await token.approve(spender, amount, {from: owner});
    let allowance = await token.allowance(owner, spender);
    assert.equal(allowance, amount, "not enough coins allowed to be spent");
  }

  async function getERC20Balance(coin, owner){
    try{
      let balance = await coin.balanceOf(owner);
      return parseInt(balance) ;
    }catch(e){
      return "invalid value";
    }
  };

  async function getNftBalance(token, owner){
    try{
      let balance = await token.balanceOf(owner);
      return parseInt(balance);
    }catch(e){
      return "invalid value";
    }
  };

  async function getNftIds(user, token, amount){

    let nftIds = [];
    for(let index = 0; index < amount; index++){
      let tokenId = await token.tokenOfOwnerByIndex(user, index);
      nftIds[index] = parseInt(tokenId);
    }
    return nftIds;
  }

  async function getOfferedNftsAmount(offerId){
    // TODO create helper function getOfferObject for following line
    let nftsAmountToReceive = await bundleOffer.offerObjects(offerId).catch(console.error);
    return nftsAmountToReceive[2].words[0];
  }

  async function getOfferPrice(offerId){
    // TODO create helper function getOfferObject for following line
    let offerPrice = await bundleOffer.offerObjects(offerId).catch(console.error);
    return web3.utils.fromWei(offerPrice[1], "wei");
  }

  async function calculateFeeAmount(offerId, offerPrice){
    // TODO create helper function getOfferObject for following line
    let feePercentage = await bundleOffer.offerObjects(offerId).catch(console.error);
    feePercentage = (feePercentage[3].words[0]) / 10;
    return feeToPay = offerPrice * feePercentage / 100;
  }


  // --------------------------------------------------
  // Unit tests
  // --------------------------------------------------

  it("link required contracts", async () => {
    // initialize contracts
     bundleOffer = await BundleOffer.deployed();

     crowns = await Crowns.deployed();
     scapes = await  Scapes.deployed();
     factory = await  ScapesFactory.deployed();

     // initialize accounts
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

  it("mint scapes", async () => {
    const amountToMint = 2;

    let sellerScapesBefore = await getNftBalance(scapes, seller);

    await mintScapes(amountToMint);

    let sellerScapesAfter = await getNftBalance(scapes, seller);

    assert.equal(sellerScapesAfter, sellerScapesBefore + amountToMint,
      `${amountToMint} werent minted for seller`);

    // minting
    async function mintScapes(amountToMint){
      let generation = 0;
      let quality = 1;

      for(var i = 0; i < amountToMint; i++){
        await factory.mintQuality(seller, generation, quality, {from: owner}).catch(console.error);
      }
    }

  });

  it("approve scapes", async () => {
    await scapes.setApprovalForAll(bundleOffer.address, true, {from: seller}).catch(console.error);
    await scapes.setApprovalForAll(bundleOffer.address, true, {from: buyer}).catch(console.error);

    let buyerIsApproved = await scapes.isApprovedForAll(buyer, bundleOffer.address);
    let sellerIsApproved = await scapes.isApprovedForAll(seller, bundleOffer.address);

    assert.equal(buyerIsApproved, true, "buyers tokens are not approved");
    assert.equal(sellerIsApproved, true, "seller tokens are not approved");
  });

  it("mint crowns", async () => {

    let amountToMint = web3.utils.toWei("100", "ether");

    let buyerCwsBefore = Math.floor(parseInt(await crowns.balanceOf(buyer))/ether);

    await crowns.transfer(buyer, amountToMint, {from: owner});

    let buyerCwsAfter = Math.floor(parseInt(await crowns.balanceOf(buyer))/ether);

    assert.equal(buyerCwsBefore+ amountToMint/ether, buyerCwsAfter,
      "user received insufficient amount");
  });

  it("add crowns currency address", async () => {
    await bundleOffer.addSupportedCurrency(crowns.address, {from: owner})
      .catch(console.error);

    let currencyIsSupported = await bundleOffer.supportedCurrencies(crowns.address);

    assert.equal(currencyIsSupported, true, "currency address not added");
  });

  it("add native currency address", async () => {
    let currencyAddress = "0x0000000000000000000000000000000000000000";

    await bundleOffer.addSupportedCurrency(currencyAddress, {from: owner})
      .catch(console.error);

    let currencyIsSupported = await bundleOffer.supportedCurrencies(currencyAddress);

    assert.equal(currencyIsSupported, true, "currency address not added");
  });

  it("add scapes nft address", async () => {
    await bundleOffer.addSupportedNft(scapes.address, {from: owner}).catch(console.error);

    let addressAdded = await bundleOffer.supportedNfts(scapes.address);

    assert.isTrue(addressAdded, "nft address not added");
  });

  it("create offer with scapes", async () => {
    // address _currencyAddress,
    // uint _price,
    // uint _nftsAmount,
    // address[] calldata _nftAddresses,
    // uint[] calldata _nftIds

    let currencyAddress = crowns.address;
    let price = web3.utils.toWei("5", "ether");
    let nftsAmount = 2;
    let nftIds = await getNftIds(seller, scapes, nftsAmount);
    let nftAddresses = new Array(nftsAmount).fill(scapes.address);

    let contractScapesBefore = await getNftBalance(scapes, bundleOffer.address);

    await scapes.setApprovalForAll(bundleOffer.address, true, {from: seller});
    await bundleOffer.createOffer(currencyAddress, price, nftsAmount, nftIds, nftAddresses,
      {from: seller});

    let contractScapesAfter = await getNftBalance(scapes, bundleOffer.address);

    assert.equal(contractScapesAfter, contractScapesBefore + nftsAmount,
      `${nftsAmount} nfts werent sent to contract`);
  });

  xit("cancel previous offer", async () => {
    let offerId = 1;  // TODO fetch offerId
    console.log(offerId);

    let sellerScapesBefore = await getNftBalance(scapes, seller);

    let nftsToReceive = await getOfferedNftsAmount(offerId);
    await bundleOffer.cancelOffer(offerId, {from: seller});

    let sellerScapesAfter = await getNftBalance(scapes, seller);

    // assert.equal(sellerScapesAfter, sellerScapesBefore + nftsToReceive,
    //   `${nftsToReceive} nfts werent sent to seller`);
  });

  it("accept offer with scapes", async () => {
    let offerId = 1;
    let nftsToReceive = await getOfferedNftsAmount(offerId);
    let offerPrice = await getOfferPrice(offerId);    //TODO rename to priceToPay
    let feeToReceive = await calculateFeeAmount(offerId, offerPrice);
    let priceToReceive = offerPrice - feeToReceive;

    let buyerScapesBefore = await getNftBalance(scapes, buyer);
    let sellerCrownsBefore = await getERC20Balance(crowns, seller);
    let crownsBeforeFeeReceiver = await getERC20Balance(crowns, owner);

    await approveERC20(crowns, offerPrice, bundleOffer.address, buyer);
    await bundleOffer.acceptOffer(offerId, {from: buyer});

    let buyerScapesAfter = await getNftBalance(scapes, buyer);
    let sellerCrownsAfter = await getERC20Balance(crowns, seller);
    let crownsAfterFeeReceiver = await getERC20Balance(crowns, owner);

    assert.equal(buyerScapesAfter, buyerScapesBefore + nftsToReceive,
      `${nftsToReceive} nfts werent sent to buyer`);
    assert.equal(sellerCrownsAfter, sellerCrownsBefore + priceToReceive,
      `price of ${priceToReceive/ether} wasnt sent to seller`);
    assert.equal(sellerCrownsAfter, sellerCrownsBefore + priceToReceive,
      `fee of ${feeToReceive/ether} wasnt sent to feeReceiver`);
  });

  it("create offer with native currency", async () => {});

  it("cancel offer with native currency", async () => {});

  it("accept offer with native currency", async () => {});
})
