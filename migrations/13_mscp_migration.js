var MscpToken = artifacts.require("./MscpToken.sol");
var MscpVesting = artifacts.require("./MscpVesting.sol");


async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}


module.exports = async function(deployer, network) {

    if (network == "ganache") {
      let startTime = Math.floor(Date.now()/1000) + 100;
      await deployer.deploy(MscpToken).then(function(){
          console.log("Mscp token contract was deployed at address: "+MscpToken.address);
      });
      await deployer.deploy(MscpVesting, MscpToken.address, startTime).then(function(){
          console.log("Mscp vesting contract was deployed at address: "+MscpVesting.address);
      });

    } else if (network == "rinkeby") {
      let startTime = Math.floor(Date.now()/1000) + 100;
      let mscpToken = "";
      await deployer.deploy(MscpToken).then(function(){
          console.log("Mscp token contract was deployed at address: "+MscpToken.address);
      });
      await deployer.deploy(MscpVesting, MscpToken.address, startTime).then(function(){
          console.log("Mscp vesting contract was deployed at address: "+MscpVesting.address);
      });

    } else if (network == "bsctestnet") {
      let startTime = Math.floor(Date.now()/1000) + 100;
      let mscpToken = "";
      await deployer.deploy(MscpToken).then(function(){
          console.log("Mscp token contract was deployed at address: "+MscpToken.address);
      });
      await deployer.deploy(MscpVesting, MscpToken.address, startTime).then(function(){
          console.log("Mscp vesting contract was deployed at address: "+MscpVesting.address);
      });

    } else if (network == "moonbase") {
      let startTime = Math.floor(Date.now()/1000) + 100;
      let mscpToken = "";
      await deployer.deploy(MscpToken).then(function(){
          console.log("Mscp token contract was deployed at address: "+MscpToken.address);
      });
      await deployer.deploy(MscpVesting, MscpToken.address, startTime).then(function(){
          console.log("Mscp vesting contract was deployed at address: "+MscpVesting.address);
      });

    } else if (network == "mainnet") {
      let startTime = Math.floor(Date.now()/1000) + 100;
      let mscpToken = "";
      await deployer.deploy(MscpToken).then(function(){
          console.log("Mscp token contract was deployed at address: "+MscpToken.address);
      });
      await deployer.deploy(MscpVesting, MscpToken.address, startTime).then(function(){
          console.log("Mscp vesting contract was deployed at address: "+MscpVesting.address);
      });

    } else if (network == "bsc") {
      let startTime = Math.floor(Date.now()/1000) + 100;
      let mscpToken = "";
      await deployer.deploy(MscpToken).then(function(){
          console.log("Mscp token contract was deployed at address: "+MscpToken.address);
      });
      await deployer.deploy(MscpVesting, MscpToken.address, startTime).then(function(){
          console.log("Mscp vesting contract was deployed at address: "+MscpVesting.address);
      });
    }
};
