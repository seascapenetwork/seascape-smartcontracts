const { assert } = require("chai");

var Submission = artifacts.require("./SeapadSubmission.sol");
var Tier = artifacts.require("./SeapadTier");
var Crowns = artifacts.require("./CrownsToken.sol");

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

contract("Seapad Submission", async accounts => {
  //game data
  let cwsAmount = web3.utils.toWei("10000", "ether");
  let duration = 100;    // Entrance to submit goes 10 seconds

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
  it("starts a new project for few seconds", async () => {
    tier = await Tier.deployed();
    submission = await Submission.deployed();
    crowns = await Crowns.deployed();

    gameOwner = accounts[0];
    player = accounts[1];

    await crowns.transfer(player, cwsAmount, {from: gameOwner});
    await crowns.approve(tier.address, cwsAmount, {from: player});

    // Claim minimum tier level to test the submission
    let level = 0;
    let badge = await tier.badges(player);
    let nonce = parseInt(badge.nonce.toString());
    let [v, r, s] = await signBadge(player, nonce, level);

    await tier.claim(level, v, r, s, {from: player});

    level++;
    nonce++;
    [v, r, s] = await signBadge(player, nonce, level);
    await tier.claim(level, v, r, s, {from: player});

    badge = await tier.badges(player);

    assert.equal(badge.level, level, "User should be at tier 1");
  });

  it("should start a new project", async () => {
    let startTime = parseInt(new Date().getTime() / 1000) + 20;
    let endTime = startTime + duration;
    
    try {
      await submission.addProject(startTime, endTime, {from: player});
    } catch(e) {
      assert.equal(e.reason, "Ownable: caller is not the owner");
    }

    await submission.addProject(startTime, endTime, {from: gameOwner});

    let project = await submission.projects(1);

    assert.equal(project.startTime, startTime, "Wrong time when project starts");
  });

  //does not wait a week to see if session is closed
  it("should submit to entrance", async () => {
    let projectId = 2;

    try {
      await submission.submit(projectId, {from: player});
    } catch(e) {
      assert.equal(e.reason, "Seapad: INVALID_PROJECT_ID");
    }

    projectId = 1;
    try {
      await submission.submit(projectId, {from: player});
    } catch (e) {
      assert.equal(e.reason, "Seapad: NOT_STARTED_YET");
    }

    console.log("Wait 15 seconds to the entrance start...");
    await sleep(15 * 1000);
    console.log("Waiting finished, continue to test!");

    try {
      await submission.submit(projectId, {from: gameOwner});
    } catch (e) {
      assert.equal(e.reason, "Seapad: NOT_QUALIFIED");
    }

    await submission.submit(projectId, {from: player});

    let project = await submission.projects(projectId);
    assert.equal(project.participants, 1, "No participants in project");
  });

});
