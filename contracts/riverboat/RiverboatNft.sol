// Riverboats NFT
// SPDX-License-Identifier: MIT
pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";

/// @author Nejc Schneider
contract RiverboatNft is ERC721, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private tokenId;

    address private factory;
    /// tokenId => type
    mapping(uint256 => uint256) public typeOf;

    event Minted(address indexed owner, uint256 indexed id/*, uint256 type*/);

    /**
     * @dev Sets the {name} and {symbol} of token.
     * Initializes {decimals} with a default value of 18.
     * Mints all tokens.
     * Transfers ownership to another account. So, the token creator will not be counted as an owner.
     */
    constructor() public ERC721("Riverboats", "BOAT") {
        tokenId.increment();
    }

    modifier onlyFactory() {
        require(factory == _msgSender(), "Only NFT Factory can call");
        _;
    }

    function mint(address _to, uint256 _type) public onlyFactory returns(uint256) {
        uint256 _tokenId = tokenId.current();
        require(_tokenId <= 1000, "Exceeded max supply cap of 1000");

        typeOf[_tokenId] = _type;
        tokenId.increment();

        _safeMint(_to, _tokenId);

        emit Minted(_to, _tokenId/*, _type*/);
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
