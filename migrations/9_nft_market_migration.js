var NftMarket = artifacts.require("./NftMarket.sol");



async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}


const tipsFeeRate = 100;	// 1 = 0.1%, 100 = 10%

module.exports = function(deployer, network) {
      if (network == "ganache") {
        var feesReciever = getAccount(3);
        deployer.deploy(NftMarket, feesReciever, tipsFeeRate)
         .then(function(){
            console.log("Market contract was deployed at address: "+NftMarket.address);
        });
      }
      else if (network == "rinkeby" || network == "moonbase") {
          var feesReciever = "0x5bDed8f6BdAE766C361EDaE25c5DC966BCaF8f43";

          deployer.deploy(NftMarket, feesReciever, tipsFeeRate)
           .then(function(){
              console.log("Market contract was deployed at address: "+NftMarket.address);
          });
        }
};
