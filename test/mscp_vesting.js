var MscpVesting = artifacts.require("./MscpVesting.sol");
var MscpToken = artifacts.require("./MscpToken.sol");




contract("MscpVesting", async accounts => {


  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


///////////// GLOBAL VARS ///////////////

  const ether = 1000000000000000000;
  const strategicSupply = 8000000;
  const privateSupply = 8500000;
  const rewardStrategic = 2000000;
  const rewardPrivate = 1500000;


  // imported contracts
  let mscpVesting = null;
  let mscpToken = null;

  // session & accounts data
  let strategicInvestor = null;
  let privateInvestor = null;
  let maliciousInvestor = null;
  let owner = null;

  // balances data
  let privateBalance;
  let strategicBalance;
  let maliciousBalance;



  it("0.1 should link mscp token and mscp vesting contracts", async () => {
    mscpVesting = await MscpVesting.deployed();
    mscpToken = await MscpToken.deployed();
    owner = accounts[0];
    strategicInvestor = accounts[1];
    privateInvestor = accounts[2];
    maliciousInvestor = accounts[3];
  });

  it("1. should mint mscpTokens and transfer them to vesting contract", async () => {
    let mintingAmount = 1111111111;   // 1.1 billion
    let transferValue = "30000000";   // 30 million
    let transferAmount = web3.utils.toWei(transferValue, "ether");

    //balanceof owner
    let ownerBalance = parseInt(await mscpToken.balanceOf(owner))/ether;
    assert.equal(1111111111, ownerBalance, "owner received insufficient tokens");

    //transfer to contract
    mscpToken.transfer(mscpVesting.address, transferAmount, {from: owner});
    let contractBalance = parseInt(await mscpToken.balanceOf(mscpVesting.address))/ether;
    assert.equal(transferValue, contractBalance, "contract received insufficient tokens");
  });

  it("2. should add investors", async () => {
    await mscpVesting.addStrategicInvestor(strategicInvestor);
    let allocationStrategic = await mscpVesting.getAllocation(strategicInvestor);
    allocationStrategic = parseInt(allocationStrategic)/ether;
    assert.equal(allocationStrategic, strategicSupply, "invalid strategic investor allocation");

    await mscpVesting.addPrivateInvestor(privateInvestor);
    let allocationPrivate = await mscpVesting.getAllocation(privateInvestor);
    allocationPrivate = parseInt(allocationPrivate)/ether;
    assert.equal(allocationPrivate, privateSupply, "invalid private investor allocation");

    await mscpVesting.addPrivateInvestor(maliciousInvestor);
  });

  it("3. should not be able to withdraw before session starts", async () => {
    try{
      await mscpVesting.withdraw({from: privateInvestor});
      assert.fail();
    }catch(e){
      assert.equal(e.reason, "vesting hasnt started yet", "withdraw function should return an error");
    }
  });

  it("should pass time", async () => {
    await sleep(3000);
    let allocation = await mscpVesting.getAllocation(privateInvestor);
    assert(true);
  });

  it("4. strategic investor should be able to withdraw proper amount (with bonus)", async () => {
    await mscpVesting.withdraw({from: strategicInvestor});
    strategicBalance = parseInt(await mscpToken.balanceOf(strategicInvestor))/ether;
    console.log("strategic balance: " ,strategicBalance);
    assert.isAbove(strategicBalance, 2000000, "strategic investor received insufficient funds");
  });

  it("5. private investor should be able to withdraw proper amount (with bonus)", async () => {
    await mscpVesting.withdraw({from: privateInvestor});
    privateBalance = parseInt(await mscpToken.balanceOf(privateInvestor))/ether;
    console.log("private balance: " ,privateBalance);
    assert.isAbove(privateBalance, 1500000, "private investor received insufficient funds");
  });

  it("6. should be able to remove malicious investor", async () => {
    await mscpVesting.disableInvestor(maliciousInvestor);
    let allocation = parseInt(await mscpVesting.getAllocation(maliciousInvestor));
    assert.equal(allocation, 0, "malicious investor should have 0 remaining coins");
  });

  it("7. private and strategic investors should be able to withdraw again while malicious investor shouldnt", async () => {
    await mscpVesting.withdraw({from: strategicInvestor});
    let newStrategicBalance = parseInt(await mscpToken.balanceOf(strategicInvestor))/ether;
    console.log("new strategic balance: " ,newStrategicBalance);
    assert.isAbove(newStrategicBalance, strategicBalance, "invalid strategic investor balances");

    await mscpVesting.withdraw({from: privateInvestor});
    let newPrivateBalance = parseInt(await mscpToken.balanceOf(privateInvestor))/ether;
    console.log("new private balance: " ,newPrivateBalance);
    assert.isAbove(newPrivateBalance, privateBalance, "invalid private investor balances");

    try{
      await mscpVesting.withdraw({from: maliciousInvestor});
      assert.fail();
    }catch(e){
      assert.equal(e.reason, "nothing to withdraw", "withdraw function should return an error");
    }
  });

  it("should pass time", async () => {
    await sleep(6000);
    let allocation = await mscpVesting.getAllocation(privateInvestor);
    assert(true);
  });

  it("8. strategic investor should have proper balances after session is finished", async () => {
    await mscpVesting.withdraw({from: strategicInvestor});
    strategicBalance = parseInt(await mscpToken.balanceOf(strategicInvestor))/ether;
    console.log("final strategic balance: " ,strategicBalance);
    assert.equal(strategicBalance, 10000000, "invalid strategic investor balances");
  });

  it("9. private investor should have proper balances after session is finished", async () => {
    await mscpVesting.withdraw({from: privateInvestor});
    let privateBalance = parseInt(await mscpToken.balanceOf(privateInvestor))/ether;
    console.log("final private balance: " ,privateBalance);
    assert.equal(privateBalance, 10000000, "invalid private investor balances");
  });
});
