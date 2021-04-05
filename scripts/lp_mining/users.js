const BigNumber = require('bignumber.js');
let ProfitCircus = artifacts.require("LpMining");
let accounts;

let eventLog = require('./event_log');

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    accounts = await web3.eth.getAccounts();

    let profitCircusAddress = "0x82b6ed562f202E76A5bDBB209e077f4a96bD5605";
    let sessionId = 4;

    eventLog.init(web3, profitCircusAddress);

    let profitCircus = await ProfitCircus.at(profitCircusAddress);

    let toBlock = 6209196;
    let fromBlock = 6126585;

    let session = await profitCircus.sessions(sessionId);

    ///////////////////////////////////////////////////////////////////
    // write on db the smartcontract events of profit circus
    //await logEvents(sessionId, fromBlock, toBlock);
    
    ///////////////////////////////////////////////////////////////////
    // get users list who played the profit circus from db
    //let walletAddresses = await eventLog.getWalletAddresses();
    //console.log(`Amount of users on Profit Circus: ${walletAddresses.length}!\nFirst 100 users are:`);
    //for(var i = 0; i < 100; i++) {
    //    console.log(`    User: ${walletAddresses[i].wallet_address} deposited ${walletAddresses[i].deposit_amount} times`);
    //}

    ///////////////////////////////////////////////////////////////////
    // get all activities for a certain user
    
    // always clear the database before writing claimables
    await eventLog.truncateClaimables();

    let walletAddresses = await eventLog.getWalletAddresses();
    for (var i = 0; i < walletAddresses.length; i++) {
        //let activeUser = "0x1b02ab3621631a28484f846f286ae7ce343901f1";
        let activeUser = walletAddresses[i].wallet_address;
        

        let {deposits, claims, withdraws} = await getUserEvents(activeUser, sessionId);
        let events = sortUserEvents(deposits, withdraws, claims);
        let locked = calculateUserLockedTokens(session, events);

        if (locked.claimable > 0) {
            if (locked.claimedTime == 0) {
                locked.claimedTime = new Date(1000 * session.startTime.toNumber());
            }       
            else {
                locked.claimedTime = new Date(locked.claimedTime);
            }

            locked.deposit = locked.deposit.toNumber();
            locked.sessionId = sessionId;
            locked.walletAddress = activeUser;
            locked.blockNumber = toBlock;

            await eventLog.logClaimable(locked).catch(e => {
                console.error(e);
            });

            console.log(`Logged ${i+1}/${walletAddresses.length}`);
        }
    }
    
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
        await eventLog.logClaims(i, partEnd, sessionId);
        await eventLog.logWithdraws(i, partEnd, sessionId);
        await eventLog.logDeposits(i, partEnd, sessionId);

        await new Promise(r => setTimeout(r, delay));
    }

    return true;
};

let getUserEvents = async function(walletAddress, sessionId) {
    let deposits = await eventLog.getUserDeposits(walletAddress, sessionId);
    let withdraws = await eventLog.getUserWithdraws(walletAddress, sessionId);
    let claims = await eventLog.getUserClaims(walletAddress, sessionId);

    return {deposits: deposits, withdraws: withdraws, claims: claims};
}

let sortUserEvents = function(deposits, withdraws, claims) {
    // first, let's assign the type of action, so after merge, we would know, what kind of action it is.
    for (var i = 0; i < deposits.length; i++) {
        deposits[i].type = 'deposit';
        deposits[i].time = deposits[i].deposit_time;
    }
    for (var i = 0; i < withdraws.length; i++) {
        withdraws[i].type = 'withdraw';
        withdraws[i].time = withdraws[i].withdraw_time;

    }
    for (var i = 0; i < claims.length; i++) {
        claims[i].type = 'claim';
        claims[i].time = claims[i].claim_time;
    }

    let events = deposits.concat(withdraws).concat(claims);
    
    events.sort((a, b) => {
        if (a.time < b.time) {
            return -1;
        } 
        else if (a.time > b.time) {
            return 1;
        }

        return 0;
    })

    return events;
}

let getUserShares = function(deposited, totalDeposited) {
    // Portion of deposited that player shares	
    if (deposited == 0) {
        return 0;
    } else if (totalDeposited == 0) {
        return 0;
    } else {
        return 100 * deposited / totalDeposited;
    }
};

let getUserInterest = function(session, shares) {
    // Event didn't start yet	
    if (session.startTime.toNumber() > Date.now()) {
        return 0;
    }

    if (web3.utils.fromWei(session.amount) == 0) {
        return 0;
    }

    // interest per second.	
    return parseFloat(web3.utils.fromWei(session.rewardUnit)) * shares * 0.01; // shares in %	
}


let calculateUserClaimable = function(session, claimedTime, interest) {
    if (claimedTime == 0) {
        console.log("Never claimed before");
        claimedTime = session.startTime.toNumber();
    } else {
        console.log(claimedTime);
        claimedTime = Math.round(claimedTime.getTime()/1000);
    }

    let sessionCap = Math.floor(Date.now() / 1000);
    if (isActiveSession(session) === false) {
        sessionCap = (session.startTime.add(session.period)).toNumber();

        if (claimedTime >= sessionCap) {
            console.log("Already claimed");
            return 0;
        }
    }
    let earnPeriod = sessionCap - claimedTime;
    return interest * earnPeriod;
}

let isActiveSession = function(session) {
    if (web3.utils.fromWei(session.totalReward) == 0) {
        return false;
    }

    let now = Math.floor(Date.now() / 1000);

    return now < (parseInt(session.startTime.toNumber()) + parseInt(session.period.toNumber()));
}

/**
 * Returns 
 * 1. amount of remained LP tokens to withdraw
 * 2. amount of CWS to claim
 */
let calculateUserLockedTokens = function(session, events) {
    let zero = new BigNumber("0");
    let balance = {deposit: zero, claimedTime: 0, claimable: 0};

    for (var i = 0; i < events.length; i++) {
        let event = events[i];

        let amount = new BigNumber(event.amount.toString());

        if (event.type === 'deposit') {
            if (balance.deposit.toNumber() == 0) {
                balance.claimedTime = event.time;
            }
            balance.deposit = balance.deposit.plus(amount);
        } 
        else if (event.type === 'claim') {
            balance.claimedTime = event.time;
        } 
        else if (event.type === 'withdraw') {
            balance.deposit = balance.deposit.minus(amount);
        }
    }

    if (balance.deposit.toNumber() == 0) {
        return balance;
    }

    let sessionAmount = parseFloat(web3.utils.fromWei(session.amount));
    let shares = getUserShares(balance.deposit.toNumber(), sessionAmount);
    let interestPerSecond = getUserInterest(session, shares);

    balance.claimable = calculateUserClaimable(session, balance.claimedTime, interestPerSecond);

    return balance;
}