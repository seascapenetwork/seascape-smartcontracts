var NftMarket = artifacts.require("./NftMarket.sol");

let seascape = require("seascape");

async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}

const tipsFeeRate = 10;	// 1 = 0.1%, 10 = 1%, 100 = 10%

async function feeReceiver(network) {
  if (network == "ganache") {
    return await getAccount(3);
  } 
  else if (network.indexOf("rinkeby") > -1 || network.indexOf("moonbase") > -1) {
    return await getAccount(0);
  } else if (network == 'bsc') {
    return "0x02eb080e2b59744DF2Cb654e1fe41c608250bEC9";
  } else if (network == 'moonriver') {
    return "0x02eb080e2b59744DF2Cb654e1fe41c608250bEC9";
  } else if (network == 'mainnet') {
    return "0x02eb080e2b59744DF2Cb654e1fe41c608250bEC9";
  }

  throw `Unsupported network '${network}' for the feeReceiver`;
}

module.exports = async function(deployer, network) {
  // Upload the smartcontract configuration
  let empty = true;
  let tempCdn = true;

  let projectPath = new seascape.CdnUtil.ProjectPath('seascape', 'beta', empty, tempCdn);

  let smartcontractPath = new seascape.CdnUtil.SmartcontractPath(await deployer.network_id, 'scape-store');

  await deployer.deploy(NftMarket, await feeReceiver(network), tipsFeeRate).catch(console.error);

  console.log("Scape store contract was deployed at address: "+NftMarket.address);

  let smartcontract = new seascape.CdnUtil.SmartcontractParams(
    'ScapeStore', 
    NftMarket.abi,
    NftMarket.address, 
    NftMarket.transactionHash, 
    await getAccount(0)
  );

  let cdnUpdated = await seascape.CdnWrite.setSmartcontract(projectPath, smartcontractPath, smartcontract);

  if (cdnUpdated) {
    console.log(`CDN was updated successfully`);
  } else {
    console.log(`CDN update failed. Please upload upload it manually!`);
    console.log(projectPath, smartcontractPath, smartcontract);
  }

  console.log(`Now, set supported currencies by calling scripts/nft_market/init.js`);
};
