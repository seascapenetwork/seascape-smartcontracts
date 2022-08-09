// Seascape NFT
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

/// @author Medet Ahmetson
contract SeascapeNft is ERC721, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private tokenId;

    struct Params {
	    uint256 quality;   // seascape points
	    uint8 generation;
    }

    address private factory;

    string private _baseLink;

    mapping(uint256 => Params) public paramsOf;

    event Minted(address indexed owner, uint256 indexed id, uint256 generation, uint8 quality);
    
    /**
     * @dev Sets the {name} and {symbol} of token.
     * Initializes {decimals} with a default value of 18.
     * Mints all tokens.
     * Transfers ownership to another account. So, the token creator will not be counted as an owner.
     */
    constructor() ERC721("Seascape NFT", "SCAPES") {
	tokenId.increment();
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

    function _baseURI() internal override view returns (string memory) {
        return _baseLink;
    }

    function setBaseUri(string memory _uri) public onlyOwner {
        _baseLink = _uri;
    }
}
