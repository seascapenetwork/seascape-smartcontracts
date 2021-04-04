// var SafeMath = artifacts.require("./SafeMath.sol");
// var Address = artifacts.require("./Address.sol");
// var UniswapV2Library = artifacts.require("./UniswapV2Library.sol");
// var SafeERC20 = artifacts.require("./SafeERC20.sol");

// var IERC721Receiver = artifacts.require("./IERC721Receiver.sol");
// var ReentrancyGuard = artifacts.require("./ReentrancyGuard.sol");
// var IERC721 = artifacts.require("./IERC721.sol");
var NFTMarketV2 = artifacts.require("./NFTMarketV2.sol");


var myAddress = "0x08302CF8648A961c607e3e7Bd7B7Ec3230c2A6c5";



module.exports = function(deployer, network) {
	deployer.then(async () => {

	// await deployer.deploy(SafeMath);
	// console.log("SafeMath contract was deployed at address: "+SafeMath.address);
	// await deployer.deploy(Address);
	// console.log("Address contract was deployed at address: "+Address.address);
	// await deployer.deploy(UniswapV2Library);
	// console.log("UniswapV2Library contract was deployed at address: "+UniswapV2Library.address);
	// await deployer.deploy(SafeERC20);
	// console.log("SafeERC20 contract was deployed at address: "+SafeERC20.address);

	// await deployer.deploy(ReentrancyGuard);
	// console.log("ReentrancyGuard contract was deployed at address: "+ReentrancyGuard.address);
	// await deployer.deploy(IERC721);
	// console.log("IERC721 contract was deployed at address: "+IERC721.address);
	// await deployer.deploy(IERC721Receiver);
	// console.log("IERC721Receiver contract was deployed at address: "+IERC721Receiver.address);
	await deployer.deploy(NFTMarketV2);
	console.log("NFTMarketV2 contract was deployed at address: "+NFTMarketV2.address);
	});
};
