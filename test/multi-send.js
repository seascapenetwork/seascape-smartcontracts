let MultiSend = artifacts.require("./MultiSend.sol");
let Nft = artifacts.require("./SeascapeNft.sol");
let Factory = artifacts.require("./NftFactory.sol");



contract("Multi Send", async accounts => {

    // --------------------------------------------------
    // Global variables
    // --------------------------------------------------

    // contracts
    let nft = null;
    let factory = null;
    let multiSend = null;

    // EOAs
    let sender = null;
    let receiver = null;


    it("link required contracts", async () => {
	     multiSend = await MultiSend.deployed();
       scapes = await  Scapes.deployed();
       factory = await  ScapesFactory.deployed();
       scapeSwapParams =  await ScapeSwapParams.deployed();


       //initialize accounts
	     sender = accounts[0];
       receiver = accounts[1];
    });



});
