const { assert } = require("chai");

var Tier = artifacts.require("./SeapadTier.sol");
var Crowns = artifacts.require("./CrownsToken.sol");

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

contract("Seapad Tier", async accounts => {
  //game data
  let cwsAmount = web3.utils.toWei("10000", "ether");

  // imported contracts
  let tier = null;
  let crowns = null;

  //session & accounts data
  let player = null;
  let gameOwner = null;

  async function signBadge(investor, nonce, level) {
    //v, r, s related stuff
    let bytes32 = web3.eth.abi.encodeParameters(["uint256"], [nonce]);
    let bytes1 = web3.utils.bytesToHex([level]);
    let str = investor + bytes32.substr(2) + bytes1.substr(2);
    let data = web3.utils.keccak256(str);
    let hash = await web3.eth.sign(data, gameOwner);

    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
        v += 27;
    }

    return [v, r, s];
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // before player starts, need a few things prepare.
  // one of things to allow nft to be minted by nft factory
  it("initiates the contracts and set the badge user to game owner.", async () => {
    tier = await Tier.deployed();
    crowns = await Crowns.deployed();

    gameOwner = accounts[0];
    player = accounts[1];

    await crowns.transfer(player, cwsAmount, {from: gameOwner});

    await tier.setBadgeUser(gameOwner, {from: gameOwner});

    let setted = await tier.badgeUsers(gameOwner);
    assert.equal(setted, true, "Game Owner should be added to list of badge users");
  });

  it("should fail to claim tier 1, before claiming tier 0", async () => {
    // To pay for fee
    await crowns.approve(tier.address, cwsAmount, {from: player});

    let level = 1;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    try {
        await tier.claim(level, v, r, s, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Seapad: LEVEL_MISMATCH");
    }
  });

  //does not wait a week to see if session is closed
  it("should claim tier 0", async () => {
    let level = 0;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    await tier.claim(level, v, r, s, {from: player});

    let claimedBadge = await tier.badges(player);
    assert.equal(claimedBadge.nonce, 1, "invalid nonce in badge");
    assert.equal(claimedBadge.usable, true, "badge is not registered");
  });

  it("should claim tier 1", async () => {
    let level = 1;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    await tier.claim(level, v, r, s, {from: player});

    let claimedBadge = await tier.badges(player);
    assert.equal(claimedBadge.nonce, 2, "invalid nonce in badge");
    assert.equal(claimedBadge.usable, true, "badge is not registered");
    assert.equal(claimedBadge.level, level, "badge is not level 1");
  });

  it("should fail to claim tier 0 after claiming tier 1", async () => {
    let level = 0;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    try {
        await tier.claim(level, v, r, s, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Seapad: CLAIM_0");
    }
  });

  it("should fail to re-claim tier 1, when tier 1 is usable by badge user", async () => {
    let level = 1;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    try {
        await tier.claim(level, v, r, s, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Seapad: INVALID_LEVEL");
    }
  });


  it("uses the badge", async () => {
    let level = 1;
    
    await tier.use(player, level, {from: gameOwner});

    let badge = await tier.badges(player);
    assert.equal(badge.usable, false, "Bagde not updated");
  });

  it("can not claim any tier except used tier, which is tier 1", async () => {
    let level = 0;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    try {
        await tier.claim(level, v, r, s, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Seapad: LEVEL_MISMATCH");
    }
  });

  it("re-claims tier 1 which is used", async () => {
    let level = 1;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    await tier.claim(level, v, r, s, {from: player});

    let claimedBadge = await tier.badges(player);
    assert.equal(claimedBadge.nonce, nonce + 1, "invalid nonce in badge");
    assert.equal(claimedBadge.usable, true, "badge is not registered");
    assert.equal(claimedBadge.level, level, "badge is not level 1");
  });

  it("should fail to claim tier 3, since tier 2 not claimed", async () => {
    let level = 3;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    try {
        await tier.claim(level, v, r, s, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Seapad: INVALID_LEVEL");
    }
  });

  it("claims tier 2", async () => {
    let level = 2;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    await tier.claim(level, v, r, s, {from: player});

    let claimedBadge = await tier.badges(player);
    assert.equal(claimedBadge.nonce, nonce + 1, "invalid nonce in badge");
    assert.equal(claimedBadge.usable, true, "badge is not registered");
    assert.equal(claimedBadge.level, level, "badge is not level 2");
  });

  it("claims tier 3", async () => {
    let level = 3;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    await tier.claim(level, v, r, s, {from: player});

    let claimedBadge = await tier.badges(player);
    assert.equal(claimedBadge.nonce, nonce + 1, "invalid nonce in badge");
    assert.equal(claimedBadge.usable, true, "badge is not registered");
    assert.equal(claimedBadge.level, level, "badge is not level 3");
  });

  it("should fail to claim non existing tier 4 ", async () => {
    let level = 4;
    
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());

    let [v, r, s] = await signBadge(player, nonce, level);

    try {
        await tier.claim(level, v, r, s, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Seapad: INVALID_PARAMETER");
    }
  });

  it("should set fees", async () => {
    let fees = [
        web3.utils.toWei("100", "ether"),     // Tier 0
        web3.utils.toWei("1", "ether"),    // Tier 1    
        web3.utils.toWei("5", "ether"),    // Tier 2
        web3.utils.toWei("10", "ether"),   // Tier 3
    ];

    // player can not claim
    try {
        await tier.setFees(fees, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Ownable: caller is not the owner");
    }

    // game owner can claim
    await tier.setFees(fees, {from: gameOwner});

    let level0Fee = await tier.fees(0);
    let level3Fee = await tier.fees(3);

    assert.equal(level0Fee, fees[0], "Tier 0 zero mismatch");
    assert.equal(level3Fee, fees[3], "Tier 3 zero mismatch");
  });

  it("should set claim verifier", async () => {
    // player can not set it
    try {
        await tier.setClaimVerifier(player, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Ownable: caller is not the owner");
    }

    // game owner can claim
    await tier.setClaimVerifier(player, {from: gameOwner});

    let claimVerifier = await tier.claimVerifier();

    assert.equal(claimVerifier, player, "Claim verifier not updated");
  });

  it("should set badge user", async () => {
    // player can not set it
    try {
        await tier.setBadgeUser(player, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Ownable: caller is not the owner");
    }

    // game owner can claim
    await tier.setBadgeUser(player, {from: gameOwner});

    let badgeUser = await tier.badgeUsers(player);

    assert.equal(badgeUser, true, "Not added");
  });

  it("should unset badge user", async () => {
    // player can not set it
    try {
        await tier.unsetBadgeUser(player, {from: player});
    } catch(e) {
        assert.equal(e.reason, "Ownable: caller is not the owner");
    }

    // game owner can claim
    await tier.unsetBadgeUser(player, {from: gameOwner});

    let badgeUser = await tier.badgeUsers(player);

    assert.equal(badgeUser, false, "Not removed");
  });
});
