let MultiSend = artifacts.require("./MultiSend.sol");
let Scapes = artifacts.require("./SeascapeNft.sol");
let ScapesFactory = artifacts.require("./NftFactory.sol");



contract("Multi Send", async accounts => {

    // --------------------------------------------------
    // Global variables
    // --------------------------------------------------

    // contracts
    let scapes = null;
    let factory = null;
    let multiSend = null;

    // EOAs
    let owner = null;
    let sender = null;
    let receiver = null;

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
	     multiSend = await MultiSend.deployed();
       scapes = await  Scapes.deployed();
       factory = await  ScapesFactory.deployed();

       // initialize accounts
       owner = accounts[0];
	     sender = accounts[1];
       receiver = accounts[2];
    });

    it("set scape factory and add generator", async () => {
      await scapes.setFactory(factory.address).catch(console.error); //same as setMinter
      await factory.addGenerator(owner, {from: owner}).catch(console.error);

      let isGenerator = await factory.isGenerator(owner).catch(console.error);
      assert.equal(isGenerator, true, `owner should be given a role of generator`);
    });

    it("mint scapes", async () => {
      const amountToMint = 3;

      let senderScapesBefore = await getNftBalance(scapes, sender);

      await mintScapes(amountToMint);

      let senderScapesAfter = await getNftBalance(scapes, sender);

      assert.equal(senderScapesAfter, senderScapesBefore + amountToMint,
        `${amountToMint} werent minted for sender`);

      // minting
      async function mintScapes(amountToMint){
        let generation = 0;
        let quality = 1;

        for(var i = 0; i < amountToMint; i++){
          await factory.mintQuality(sender, generation, quality, {from: owner}).catch(console.error);
        }
      }

    });

    it("cant send 1 scape", async () => {
      let amount = 1;
      let nftIds = await getNftIds(sender, scapes, amount);
      let nftAddresses = [scapes.address];

      try{
        await multiSend.sendNfts(amount, receiver, nftAddresses, nftIds, {from: sender});
        assert.fail();
      }catch(e){
        assert.equal(e.reason, "minimum 2 nfts are required");
      }
    });

    it("cant send 12 scapes", async () => {
      let amount = 12;
      let nftIds = Array.from(Array(amount).keys())
      let nftAddresses = new Array(amount).fill(scapes.address);

      try{
        await multiSend.sendNfts(amount, receiver, nftAddresses, nftIds, {from: sender});
        assert.fail();
      }catch(e){
        assert.equal(e.reason, "maximum 10 nfts are allowed");
      }
    });

    it("cant send nfts if not an owner", async () => {
      let amount = 3;
      let nftIds = await getNftIds(sender, scapes, amount);
      let nftAddresses = new Array(amount);
      nftAddresses.fill(scapes.address);

      try{
        await multiSend.sendNfts(amount, sender, nftAddresses, nftIds, {from: receiver});
        assert.fail();
      }catch(e){
        assert.equal(e.reason, "sender not owner of nft");
      }
    });

    it("can send several scapes", async () => {
      let amount = 2;
      let nftIds = await getNftIds(sender, scapes, amount);
      let nftAddresses = new Array(amount).fill(scapes.address);

      let receiverScapesBefore = await getNftBalance(scapes, receiver);

      await scapes.setApprovalForAll(multiSend.address, true, {from: sender});
      await multiSend.sendNfts(amount, receiver, nftAddresses, nftIds, {from: sender});

      let receiverScapesAfter = await getNftBalance(scapes, receiver);

      assert.equal(receiverScapesAfter, receiverScapesBefore + amount,
        `${amount} nfts werent sent to receiver`);
    });

    xit("can send different nfts", async () => {

    });


});
