# seascape-smartcontracts
Smartcontracts for https://seascape.network/ &ndash; a platform for games.
It's developed by truffle framework. For more in-depth explanation, please visit https://docs.seascape.network/

### This repository depends on the following **submodules**:
 * crowns - an ERC-20 token used as a in-game token of Blocklords. Strategy game on ethereum at https://blocklords.io

### Repository consists the following smartcontracts:
 * ```contracts/seascape_nft/SeascapeNft.sol``` &ndash; Based on openzeppelin ERC721 library. This NFT is burnable, owns metadata, mintable. However minting option are available through another smartcontract - Nft Factory. Seascape NFT also stores additional properties used in Seascape Network.
 * ```contracts/seascape_nft/NftFactory.sol``` &ndash; Minting Seascape NFTs. It is using Role permission feature to mint different kind of NFTs.
 * ```contracts/seascape_nft/NftTypes.sol``` &ndash; _library_ used in another smartcontracts. It has a quality property of NFTs. Quality is one of the additional data used in Seascape Network.
 
 * ```contracts/game_1/LpMining.sol``` &ndash; The goal of the game is to stake uniswap (https://uniswap.org) LP tokens for CWS reward. Staking formula is in the Smartcontract. Also Staking period is going during the Game Session. __Optionally:__ Each player can mint one nft in every game session.
 * ```contracts/game_2/NftRush.sol``` &ndash; The goal of the game is to spend CWS token to mint Seascape NFTs. More you spend, the higher the quality of the minted Seascape NFT. This game also has a leaderboard. The top ten winners of leaderboard can claim addional tokens.
 * ```contracts/game_3/NftStaking.sol``` &ndash; The goal of the game is to stake Seascape NFT for CWS reward. When claiming the CWS reward, NFT will be burnt.
