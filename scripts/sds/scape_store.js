require('dotenv').config();
var ScapeStore = artifacts.require("./NftMarket.sol");
let sds = require("sds-cli");

module.exports = async (callback) => {
    let from = config.config.from;
    let group = "marketplace";
    let name = "ScapeStore";
    let network_id = config.config.network_id;

    let smartcontract = new sds.Smartcontract(group, name);

    // If the smartcontract was deployed, then register the smartcontract in the SeascapeSDS
    params = get_params(network_id.toString())
    await smartcontract.registerInTruffle(params.address, params.txid, web3, from, ScapeStore).catch();

    callback();
}

function get_params(network_id) {
    if (network_id === "1") {
        return {
            address: "0x0862abd9520A315D11348c06E8C8C479805938FD",
            txid: "0x1c2764d446032cce0a7840d153117b0e92cc01dc3ab346d79be832c803b22743"
        }
    } else if (network_id == "56") {
        return {
            address: "0xd8ceF62B7c8C803b29A825515D0c58aA053D3f59",
            txid: "0xbf79768c08d5cfbe6715253e7b73b135f9ef30495cbf974ff5c76ffd1e6fd3de"
        }
    } else if (network_id == "1285") {
        return {
            address: "0xae54f8927ADAdB65EC79f7130B1a46FEd35E8bFd",
            txid: "0xaafa2f1532a69374f6876b76786127d9fb60305303c412ea778398ec9229880c"
        }
    } else if (network_id == "1284") {
        return {
            address: "0xe563557fd604e3a40fff57a8f5b9082aaea10016",
            txid: "0x6e8211f366526c42a3e996df2a30c070972d6554bf8252ab99bbf2f98cf1074e"
        }
    }

    throw `not found register parameters for network id '${network_id}'`
}