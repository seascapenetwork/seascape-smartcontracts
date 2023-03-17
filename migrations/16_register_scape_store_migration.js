require('dotenv').config();
var ScapeStore = artifacts.require("./NftMarket.sol");
let { Truffle } = require("../../sds-ts/compiled/index");

module.exports = async (deployer, network) => {
  let group = "marketplace";
  let name = "ScapeStore";

  let smartcontract = new Truffle(group, name, deployer, ScapeStore, web3);

  // If the smartcontract was deployed, then register the smartcontract in the SeascapeSDS
  let address = "0xd8ceF62B7c8C803b29A825515D0c58aA053D3f59";
  let txid = "0xbf79768c08d5cfbe6715253e7b73b135f9ef30495cbf974ff5c76ffd1e6fd3de";
  try {
    await smartcontract.register(address, txid)
  } catch (error) {
    console.error(error);
  }
}
