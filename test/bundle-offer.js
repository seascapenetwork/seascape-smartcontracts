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

  it("")
})
