var Ticket = artifacts.require("./LotteryTicket.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Lottery = artifacts.require("./Lottery.sol");

module.exports = function(deployer, network) {
    deployer.deploy(Ticket).then(function(){
	    console.log("Seascape Ticket deployed at address: "+Ticket.address);
    });
};
 

var Ticket = artifacts.require("./LotteryTicket.sol");

module.exports = async function(deployer, network) {
    await deployer.deploy(Ticket);
    console.log("Lottery ticket address: "+Ticket.address);
    
    await deployer.deploy(Crowns);
    console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
    
    await deployer.deploy(Lottery, Crowns.address, Ticket.address, 5, 9);
    console.log("Lottery contract was deployed at address: "+Lottery.address);
};
