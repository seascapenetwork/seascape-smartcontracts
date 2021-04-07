const BigNumber = require('bignumber.js');
let NftBrawl = artifacts.require("NftRush");
let accounts;

let eventLog = require('./event_log');

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    accounts = await web3.eth.getAccounts();

    let nftBrawlAddress = "0xe5bD525aaF599B75362d5b1c78ECCc47266adE47";
    let sessionId = 2;

    eventLog.init(web3, nftBrawlAddress);

    //let nftBrawl = await NftBrawl.at(nftBrawlAddress);

    let toBlock = 12190741;
    let fromBlock = 12189315;

    //let session = await nftBrawl.sessions(sessionId);

    ///////////////////////////////////////////////////////////////////
    // write on db the smartcontract events of profit circus
    await logEvents(sessionId, fromBlock, toBlock);

    console.log("Everything is checked!");

    callback(null, null);
};


let logEvents = async function(sessionId, fromBlock, toBlock) {
    // offset is a range between from block to block
    // bsc allows 5000 only
    let offset = 5000;
    // milliseconds. just to make not pressure the bsc node.
    let delay = 2000;

    for (var i = fromBlock; i <= toBlock; i+=offset) {
        let partEnd = i+offset;

        console.log(`From: ${i} to: ${partEnd}`);
        
        // event logs from other session id than ${sessionId} are skipped
        await eventLog.logSpents(i, partEnd, sessionId);
        await eventLog.logMints(i, partEnd, sessionId);

        await new Promise(r => setTimeout(r, delay));
    }

    return true;
};