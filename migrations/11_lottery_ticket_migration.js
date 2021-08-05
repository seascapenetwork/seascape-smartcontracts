var Ticket = artifacts.require("./LotteryTicket.sol");

module.exports = function(deployer, network) {
    deployer.deploy(Ticket).then(function(){
	    console.log("Seascape Ticket deployed at address: "+Ticket.address);
    });
};
 
