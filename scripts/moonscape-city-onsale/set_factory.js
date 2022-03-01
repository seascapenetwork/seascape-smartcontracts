let Nft = artifacts.require("CityNft");
let Factory = artifacts.require("CityFactory");


let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    //--------------------------------------------------
    // Addresses setup
    //--------------------------------------------------

    // contracts
    let factory  = await Factory.at("0x66182E72c7D3B1268d304a48ddD9bd4A5D9c5C94");
    let nft     = await Nft.at("0x94Bf67B24c98eb612054A407673E0C9e946ad466");

    let user = accounts[0];
    console.log(`Using ${user}`);

    //--------------------------------------------------
    // Function calls
    //--------------------------------------------------

    await setMinter();
    await setNft();  //already set in constructor
    await setFactory();

    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    async function setMinter(){
      console.log("attempting to set factory...");
      await nft.setMinter(factory.address, {from: user}).catch(console.error);
      console.log("factory was set");
    }

    async function setNft(){
      console.log("attempting to set nft...")
      await factory.setNft(nft.address, {from: user}).catch(console.error);
      console.log("nft was set");
    }

    async function setFactory(){
      console.log("checking if user is static user?");
      let isGiven = false;
      try{
        isGiven = await factory.isStaticUser(user);
      }catch(err){
        console.log(err);
      };
      console.log(isGiven);
      if (!isGiven) {
      console.log("attemping to add static user...");
      await factory.addStaticUser(user).catch(console.error);
      console.log("user is static user");
      }
    }

}.bind(this);
