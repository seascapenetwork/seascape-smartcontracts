var NftMarket = artifacts.require("./NftMarket.sol");



async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}


const tipsFeeRate = 10;	// 1 = 0.1%, 100 = 10%

module.exports = function(deployer, network) {
      if (network == "ganache") {
        var feesReciever = getAccount(3);
        deployer.deploy(NftMarket, feesReciever, tipsFeeRate)
         .then(function(){
            console.log("Market contract was deployed at address: "+NftMarket.address);
        });
      }
      else if (network == "rinkeby") {
          var feesReciever = "0x5bDed8f6BdAE766C361EDaE25c5DC966BCaF8f43";

          deployer.deploy(NftMarket, feesReciever, tipsFeeRate)
           .then(function(){
              console.log("Market contract was deployed at address: "+NftMarket.address);
          });
      }
      else if (network == "bsctestnet") {
          var feesReciever = "0x5bDed8f6BdAE766C361EDaE25c5DC966BCaF8f43";

          deployer.deploy(NftMarket, feesReciever, tipsFeeRate)
           .then(function(){
              console.log("Market contract was deployed at address: "+NftMarket.address);
          });
      }
      else if (network == "moonbase") {
          var feesReciever = "0x5bDed8f6BdAE766C361EDaE25c5DC966BCaF8f43";

          deployer.deploy(NftMarket, feesReciever, tipsFeeRate)
           .then(function(){
              console.log("Market contract was deployed at address: "+NftMarket.address);
          });
        }
        else if (network == "moonbeam") {
            var feesReciever = "0x42360F7A29196813CfC48c1724ee8D498e64a3AE";

            deployer.deploy(NftMarket, feesReciever, tipsFeeRate)
             .then(function(){
                console.log("Market contract was deployed at address: "+NftMarket.address);
            });
          }
};
