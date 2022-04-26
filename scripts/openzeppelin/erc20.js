let ERC20 = artifacts.require("ERC20");
let SafeERC20 = artifacts.require("SafeERC20");

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {

    //--------------------------------------------------
    // Accounts and contracts configuration
    //--------------------------------------------------

    let accounts;
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    //contract address that is using ERC20
    let erc20 = await ERC20.at("0x91aDd6Fd66b689ba8Ebe2a6D16cD30d9cC0543b6");
    //let safeErc20 = await SafeERC20.at("0x91aDd6Fd66b689ba8Ebe2a6D16cD30d9cC0543b6");

    let user = accounts[0];
    console.log(`Using account ${user}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    // parameters
    let account = "0x948962dbc28B7f83fBFd5Ae9812c7a1c94E00E30";
    let spender = "0xE71d14a3fA97292BDE885C1D134bE4698e09b3B7";
    let recipient = "0xBAc0cC03dC049630C25504426263573d373316b2";

    let amount = web3.utils.toWei("5000", "ether");

    // erc20 calls
    // await name();
    // await symbol();
    // await decimals();
    // await totalSupply();
    // await balanceOf(account);
    // await approve(spender, amount);
    // await allowance(account, spender);
    await transfer(recipient, amount);
    // await transferFrom(spender, recipient, amount);

    // safeErc20 calls
    // await safeTransfer(safeErc20, recipient, amount);
    // await safeTransferFrom(safeErc20.address, spender, recipient, amount);


    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // get currency name
    async function name(){
        let name = await erc20.name().catch(console.error);
        console.log(`currency name is ${name}`);
    }

    // get currency symbol
    async function symbol(){
        let symbol = await erc20.symbol().catch(console.error);
        console.log(`currency symbol is ${symbol}`);
    }

    // get amount of currency decimals
    async function decimals(){
        let decimals = await erc20.decimals().catch(console.error);
        console.log(`currency has ${decimals} decimals`);
    }

    // get total supply of tokens
    async function totalSupply(){
        let totalSupply = await erc20.totalSupply().catch(console.error);
        console.log(`currency total supply is ${totalSupply/10e17}`);
    }

    // get current balance of 'account'
    async function balanceOf(account){
        let balanceOf = await erc20.balanceOf(account).catch(console.error);
        balanceOf = (balanceOf/10e17).toFixed(2)
        console.log(`${account} current balance is ${balanceOf}`);
    }

    // sets amount that `spender` can spend on behalf of `account` through transferFrom
    // NOTE caller should be token owner
    async function approve(spender, amount){
      console.log("attempting to set approve amount...");
      let approved = await erc20.approve(spender, amount, {from: user}).catch(console.error);
      amount = parseInt(amount);
      console.log(`${spender} was approved to spend ${amount} tokens from ${user}`);
    }

    // remaining amount that `spender` can spend on behalf of `account` through transferFrom
    async function allowance(account, spender){
        let allowance = await erc20.allowance(account, spender).catch(console.error);
        allowance = parseInt(allowance);
        console.log(`${spender} can spend ${allowance} tokens from ${account}`);
    }

    // moves `amount` of tokens from 'user' to `recipient`
    // NOTE caller should be token owner
    async function transfer(recipient, amount){
      console.log("attempting to transfer tokens...");
      await erc20.transfer(recipient, amount, {from: user}).catch(console.error);
      amount = parseInt(amount)/10e17;
      console.log(`${amount} coins were transfered from ${user} to ${recipient}`);
    }

    // moves `amount` of tokens from 'spender' to `recipient`
    // NOTE caller should be recipient
    async function transferFrom(spender, recipient, amount){
      console.log("attempting to transfer tokens from...");
      await erc20.transferFrom(spender, recipient, amount, {from: user}).catch(console.error);
      amount = parseInt(amount)/10e17;
      console.log(`${amount} coins were transfered from ${spender} to ${recipient}`);
    }

    // safely moves `amount` of tokens from 'user' to `recipient
    // NOTE caller should be token owner
    // async function safeTransfer(IERC20, recipient, amount){
    //   console.log("attempting to safe transfer tokens...");
    //   await safeErc20.safeTransfer(IERC20, recipient, amount, {from: user}).catch(console.error);
    //   amount = parseInt(amount)/10e17;
    //   console.log(`${amount} tokens were safe transfered from ${user} to ${recipient}`);
    // }
    //
    // // safely moves `amount` of tokens from 'user' to `recipient`
    // // NOTE caller should be recipient
    // async function safeTransferFrom(IERC20, spender, recipient, amount){
    //   console.log("attempting to safe transfer tokens from...");
    //   await safeErc20.safeTransferFrom(IERC20, spender, recipient, amount, {from: user}).catch(console.error);
    //   amount = parseInt(amount)/10e17;
    //   console.log(`${amount} tokens were safe transfered from ${spender} to ${recipient}`);
    // }

}.bind(this);
