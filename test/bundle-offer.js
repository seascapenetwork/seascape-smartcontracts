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
    const amountToMint = 3;

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

    let sellerCwsBalanceBefore = Math.floor(parseInt(await crowns.balanceOf(seller))/ether);

    await crowns.transfer(seller, amountToMint, {from: owner});

    let sellerCwsBalanceAfter = Math.floor(parseInt(await crowns.balanceOf(seller))/ether);

    assert.equal(sellerCwsBalanceBefore+ amountToMint/ether, sellerCwsBalanceAfter,
      "Seller didnt receive enough coins");
  });

  it("add native currency address", async () => {
    let currencyAddress = "0x0000000000000000000000000000000000000000";

    await bundleOffer.addSupportedCurrency(currencyAddress, {from: owner})
      .catch(console.error);

    let isCurrencySupported = await bundleOffer.supportedCurrencies(currencyAddress);

    assert.equal(isCurrencySupported, true, "bounty address not added");
  });

  it("create offer with scapes", async () => {});

  it("cancel offer with scapes", async () => {});

  it("accept offer with scapes", async () => {});

  it("create offer with native currency", async () => {});

  it("cancel offer with native currency", async () => {});

  it("accept offer with native currency", async () => {});
})
