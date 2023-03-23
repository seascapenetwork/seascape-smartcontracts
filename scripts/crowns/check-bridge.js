let ContractWithBridge = artifacts.require("CrownsToken");

module.exports = async function(callback) {
    let res = await init();

    callback(null, res);
};

let init = async function() {
    let contract = await ContractWithBridge.at("0x27d72484f1910F5d0226aFA4E03742c9cd2B297a");
    let bridge    = "0x5945241BBB68B4454bB67Bd2B069e74C09AC3D51";

    let bridgeAllowed = await contract.bridgeAllowed().catch(console.error);
    let bridged = await contract.bridges(bridge).catch(console.error);
    
    console.log(`Was the bridge has permission to bridge? ${bridged}, ${bridgeAllowed}`);
};
