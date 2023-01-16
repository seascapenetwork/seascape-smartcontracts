require('dotenv').config();
var ScapeStore = artifacts.require("./NftMarket.sol");
let sds = require("sds-cli")

module.exports = async (deployer, network) => {
  let from = config.networks[network].from;
  let group = "marketplace";
  let name = "ScapeStore";

  let smartcontract = new sds.Smartcontract(group, name);

  // If the smartcontract was deployed, then register the smartcontract in the SeascapeSDS
  // let address = "0xd8ceF62B7c8C803b29A825515D0c58aA053D3f59";
  // let txid = "0xbf79768c08d5cfbe6715253e7b73b135f9ef30495cbf974ff5c76ffd1e6fd3de";
  // await smartcontract.registerInTruffle(address, txid, web3, from, ScapeStore).catch();

  // constructor arguments
  const tipsFeeRate = 10;	// 1 = 0.1%, 10 = 1%, 100 = 10%
  const feeReceiver = "0x02eb080e2b59744DF2Cb654e1fe41c608250bEC9"
  
  // Truffle code. Deploy the smart contract and then set up.
  await smartcontract.deployInTruffle(deployer, ScapeStore, web3, from, [feeReceiver, tipsFeeRate]).catch();
}
