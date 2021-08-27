var HDWalletProvider = require("truffle-hdwallet-provider");
const getRevertReason = require('eth-revert-reason')

// Failed with revert reason "Failed test"
// console.log(await getRevertReason('0xf212cc42d0eded75041225d71da6c3a8348bdb9102f2b73434b480419d31d69a')) // 'Failed test'
// console.log(await getRevertReason('0x640d2e0d1f4cff9b6e273458216451efb0dc08ebc13c30f6c88d48be7b35872a', 'goerli')) // 'Failed test'
//
// // Failed with no revert reason
// console.log(await getRevertReason('0x95ac5a6a1752ccac9647eb21ef8614ca2d3e40a5dbb99914adf87690fb1e6ccf')) // ''
//
// // Successful transaction
// console.log(await getRevertReason('0x02b8f8a00a0c0e9dcf60ddebd37ea305483fb30fd61233a505b73036408cae75')) // ''

// Call from the context of a previous block with a custom provider
let txHash = '0xe0df7cda089d76511acdc75554d30f61c1f1e4fd72844c45bfd56f799ba5b055'
let network = 'moonbase'
let blockNumber = 620403;
let provider = new HDWalletProvider(process.env.MNEMONIC, `https://rpc.testnet.moonbeam.network`, 0, 5);

//let provider = getAlchemyProvider(network) // NOTE: getAlchemyProvider is not exposed in this package
async function reason(txHash, network, blockNumber, provider){
  let error = await getRevertReason(txHash, network, blockNumber, provider);
  console.log(error);
}

reason(txHash, network, blockNumber, provider);
