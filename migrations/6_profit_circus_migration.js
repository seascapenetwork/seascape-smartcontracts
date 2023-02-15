var ProfitCircus = artifacts.require("./ProfitCircus.sol");
let seascape = require("seascape");

module.exports = async function(deployer, network) {
	// const factory 	= "0x77478212aa57A7A9Cc5b611156Fce7c0697578fb"; // moonriver
	
	// const factory = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0"; // rinkeby
	
	// rinkeby v2
	const factory = "0xCbd3DC2765bd7F39a8EAd2586449558a0A82294c";

	// const factory = "0x4b692990607c5CbF7c12a8aa309FDb9042D94475";	// moonbeam alpha

	let profitCircus = new seascape.Smartcontract({name: 'profit-circus', group: 'game', artifact: ProfitCircus});
	profitCircus.deploy(deployer, factory);
};
