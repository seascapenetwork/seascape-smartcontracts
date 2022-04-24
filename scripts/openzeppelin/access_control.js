let AccessControl = artifacts.require("AccessControl");


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

    //contract address that is using AccessControl
    let accessControl = await AccessControl.at("0x9326FfC875B32677132184E68BCCC6fd75c79d51");

    let owner = accounts[0];
    console.log(`Using account ${owner}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    // global vars
    let role = "MINTER";
    let account = "0xC6EF8A96F20d50E347eD9a1C84142D02b1EFedc0";
    let index = 0;

    // contract calls
    // await hasRole(role, account);
    // await getRoleMemberCount(role);
    // await getRoleMembers(role, index);
    await getRoleAdmin(role);
    // await grantRole(role, account);
    // await revokeRole(role, account);

    // special Functions
    // await getRoleMembers(role);

    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // returns `true` if `account` has been granted `role`
    async function hasRole(role, account){
        let hasRole = await accessControl.hasRole(role, account).catch(console.error);
        console.log(`${account} has been granted role ${role}? ${hasRole}`);
    }

    // get number of accounts that have 'role'
    async function getRoleMemberCount(role){
      let amountOfUsersWithRole = await accessControl.getRoleMemberCount(role).catch(console.error);
      console.log(`${amountOfUsersWithRole} users have role ${role}`);
    }

    // get account with 'role' (the one at 'index')
    async function getRoleMember(role, index){
        let address = await accessControl.getRoleMember(role, index).catch(console.error);
        console.log(`user ${index} with role ${role} has address ${address}`);
      }
    }

    // return the admin role that controls `role`
    async function getRoleAdmin(role){
      let roleAdmin = await accessControl.getRoleAdmin(role).catch(console.error);
      console.log(`admin of ${role} role is ${roleAdmin}`);
    }

    // grants `role` to `account`.
    async function grantRole(role, account){
        console.log("attempting to grant role...");
        await accessControl.grantRole(role, account).catch(console.error);
        console.log(`${role} role has been granted to ${account}`);
    }

    // revokes `role` from `account`.
    async function revokeRole(role, account){
      console.log("attempting to revoke role...");
      await accessControl.revokeRole(role, account).catch(console.error);
      console.log(`${role} role has been revoked from ${account}`);
    }

    // print amount of accounts with 'role' and their addresses
    async function getRoleMembers(role){
      let amountOfUsersWithRole = getRoleMemberCount(role);
      // TODO fix getRoleMember call, all the getRoleMember calls should be performed on the same block
      // getRoleMember(role, index).call({}, defaultBlock).catch(console.error);
      // https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296
      for(let index = 0; index < amountOfUsersWithRole; index++)
        getRoleMembersAddresses(role, index);
    }


}.bind(this);
