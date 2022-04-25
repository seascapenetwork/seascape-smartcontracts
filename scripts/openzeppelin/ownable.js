let Ownable = artifacts.require("Ownable");


module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {

    //--------------------------------------------------
    // Accounts and contracts configuration
    //--------------------------------------------------

    let accounts;
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    //contract address that is using Ownable
    let ownable = await Ownable.at("0xEE00cfaf731B0801e4872389e009a5aB0C05c5f6");

    let user = accounts[0];
    console.log(`Using account ${user}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    // global vars
    let owner;  //dont assign value!
    let newOwner = "0x5bDed8f6BdAE766C361EDaE25c5DC966BCaF8f43";

    // contract calls
    await getOwner();
    // await renounceOwnership();
    await transferOwnership(newOwner);

    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // get current owner address
    async function getOwner(){
        owner = await ownable.owner().catch(console.error);
        console.log(`contract owner is ${owner}`);
    }

    // remove current owner.
    // CAUTION Removes any functionality that is only available to the owner.
    async function renounceOwnership(){
      console.log("attempting to renounce ownership...");
      await ownable.renounceOwnership({from: user}).catch(console.error);
      console.log(`contract at ${ownable.address} no longer has the owner`);
    }

    // transfer ownership to new account
    async function transferOwnership(newOwner){
      if(owner != newOwner){
        console.log("attempting to transfer ownership...");
        await ownable.transferOwnership(newOwner, {from: user});
        console.log(`ownership has been transfered to ${newOwner}`);
      } else {
        console.log("current owner same as new owner!");
      }
    }


}.bind(this);
