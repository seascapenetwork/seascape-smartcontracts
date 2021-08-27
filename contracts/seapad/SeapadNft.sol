// Seascape NFT
// SPDX-License-Identifier: MIT
pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";

/// @title Seapad NFT
/// @notice SeapadNFT is the NFT used in Seapad platform.
/// @author Medet Ahmetson
contract SeapadNft is ERC721, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private tokenId;

    struct Params {
	    uint256 allocation; // allocation among total pool of investors.
	    uint8 tier;         // tier level
        uint256 projectId;  // project to which it's used	
    }

    address private factory;

    /// @dev returns parameters of Seascape NFT by token id.
    mapping(uint256 => Params) public paramsOf;

    event Minted(address indexed owner, uint256 indexed id, uint256 allocation, uint8 tier, uint256 projectId);
    
    /**
     * @dev Sets the {name} and {symbol} of token.
     * Mints all tokens.
     */
    constructor() public ERC721("Lighthouse", "LIGHTHOUSE") {
	    tokenId.increment(); // set to 1 the incrementor, so first token will be with id 1.
    }

    modifier onlyFactory() {
        require(factory == _msgSender(), "Seascape NFT: Only NFT Factory can call the method");
        _;
    }

    /// @dev ensure that all parameters are checked on factory smartcontract
    function mint(address to, uint256 allocation, uint8 tier, uint256 projectId) public onlyFactory returns(uint256) {
	    uint256 _tokenId = tokenId.current();

        _safeMint(to, _tokenId);

        paramsOf[_tokenId] = Params(allocation, tier, projectId);

        tokenId.increment();

        emit Minted(to, _tokenId, allocation, tier, projectId);
        
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
