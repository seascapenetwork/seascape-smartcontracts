// Seascape NFT
// SPDX-License-Identifier: MIT
pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";

/// @title Seascape NFT based on ERC721 standard.
/// @notice Seascape NFT is the NFT used in Seascape Network platform.
/// Nothing special about it except that it has two more additional parameters to
/// for quality and generation to use in Seascape Platform.
/// @author Medet Ahmetson
contract SeascapeNft is ERC721, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private tokenId;

    struct Params {
	    uint256 quality;   // seascape points
	    uint8 generation;	
    }

    /// @dev minting of seascape nfts are done by factory contract only.
    address private factory;

    /// @dev returns parameters of Seascape NFT by token id.
    mapping(uint256 => Params) public paramsOf;

    event Minted(address indexed owner, uint256 indexed id, uint256 generation, uint8 quality);
    
    /**
     * @dev Sets the {name} and {symbol} of token.
     * Initializes {decimals} with a default value of 18.
     * Mints all tokens.
     * Transfers ownership to another account. So, the token creator will not be counted as an owner.
     */
    constructor() public ERC721("Seascape NFT", "SCAPES") {
	tokenId.increment(); // set to 1 the incrementor, so first token will be with id 1.
    }

    modifier onlyFactory() {
        require(factory == _msgSender(), "Seascape NFT: Only NFT Factory can call the method");
        _;
    }

    function mint(address _to, uint256 _generation, uint8 _quality) public onlyFactory returns(uint256) {
	uint256 _tokenId = tokenId.current();

        _safeMint(_to, _tokenId);

        paramsOf[_tokenId] = Params(_generation, _quality);

        tokenId.increment();

        emit Minted(_to, _tokenId, _generation, _quality);
        return _tokenId;
    }

    function setOwner(address _owner) public onlyOwner {
	    transferOwnership(_owner);
    }

    function setFactory(address _factory) public onlyOwner {
	    factory = _factory;
    }

    function setBaseUri(string memory _uri) public onlyOwner {
	    _setBaseURI(_uri);
    }
}
