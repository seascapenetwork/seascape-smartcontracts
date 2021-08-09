// Seascape NFT
// SPDX-License-Identifier: MIT
pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";

/// @title Seascape NFT based on ERC721 standard.
/// @notice Seascape NFT is the NFT used in Seascape Network platform.
/// Nothing special about it except that it has two more additional parameters to
/// for quality and generation to use in Seascape Platform.
/// @author Medet Ahmetson
contract LotteryTicket is ERC721, ERC721Burnable, Ownable {
    // Safe math
    using SafeMath for uint256;
    // using SafeMath16 for uint16;
    // using SafeMath8 for uint8;

    using Counters for Counters.Counter;

    Counters.Counter private tokenId;

    /// @notice holds session related data. Since event is a solidity keyword, we call them session instead.
    struct Session {
        uint256 period;       // session duration
        uint256 startTime;    // session start in unixtimestamp
    }

    struct TicketInfo {
        address  owner;
        uint256  sessionId;
        uint256  roundId;
        uint16[] numbers;
        bool     claimed;
    }

    // Token ID => Token information 
    mapping(uint256 => TicketInfo) internal ticketInfo;

    // User address => Session ID => => Round Id => Ticket IDs
    mapping(address => mapping(uint256 => mapping(uint256 => uint256[]))) internal userTickets;

    /// @dev minting of seascape nfts are done by factory contract only.
    address private factory;

    //-------------------------------------------------------------------------
    // EVENTS
    //-------------------------------------------------------------------------
    event TicketMinted(
        address indexed owner,
        uint256 sessionId,
        uint256 roundId,
        uint256 ,
        uint256[] tokenIds
    );

    //-------------------------------------------------------------------------
    // MODIFIERS
    //-------------------------------------------------------------------------
    modifier onlyFactory() {
        require(factory == _msgSender(), "Seascape Lottery Ticket: Only Ticket Factory can call the method");
        _;
    }
    
    /**
     * @dev Sets the {name} and {symbol} of token.
     * Initializes {decimals} with a default value of 18.
     * Mints all tokens.
     * Transfers ownership to another account. So, the token creator will not be counted as an owner.
     */
    constructor() public ERC721("Seascape Ticket", "TICKETS") {
       tokenId.increment(); // set to 1 the incrementor, so first token will be with id 1.
    }

    //-------------------------------------------------------------------------
    // VIEW FUNCTIONS
    //-------------------------------------------------------------------------
    function getCurrentTokenId() external view returns(uint256) {
        return tokenId.current();
    }
    function getTicketNumbers(uint256 _ticketId) external view returns(uint16[] memory) {
        return ticketInfo[_ticketId].numbers;
    }

    function getOwnerOfTicket(uint256 _ticketId) external view returns(address) {
        return ticketInfo[_ticketId].owner;
    }

    function getTicketClaimStatus(uint256 _ticketId) external view returns(bool) {
        return ticketInfo[_ticketId].claimed;
    }

    function getUserTickets(uint256 _sessionId, uint256 _roundId, address _user) external view returns(uint256[] memory) {
        return userTickets[_user][_sessionId][_roundId];
    }

    function getUserTicketsPagination(uint256 _sessionId, uint256 _roundId, address _user, uint256 cursor, uint256 size) external view returns(uint256[] memory, uint256) {
        uint256 length = size;
        if(length > userTickets[_user][_sessionId][_roundId].length - cursor) {
            length = userTickets[_user][_sessionId][_roundId].length - cursor;
        }
        uint256[] memory values = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = userTickets[_user][_sessionId][_roundId][cursor + i];
        }
        return (values, cursor + length);
    }

    //-------------------------------------------------------------------------
    // MODIFY FUNCTIONS
    //-------------------------------------------------------------------------
    function mint(address _to, uint256 _sessionId, uint256 _roundId, uint8 _numberOfTickets, uint16[] calldata _numbers) external onlyFactory returns(uint256[] memory) {
        uint256 _tokenId = tokenId.current();
        uint256[] memory tokenIds = new uint256[](_numberOfTickets);

        for(uint8 i = 0; i < _numberOfTickets; i++) {
            tokenIds[i] = _tokenId;

            ticketInfo[_tokenId] = TicketInfo(_to, _sessionId, _roundId, _numbers, false);

            userTickets[_to][_sessionId][_roundId].push(_tokenId);

            _safeMint(_to, _tokenId);

            tokenId.increment();
        }

        emit TicketMinted(_to, _sessionId, _roundId,  _numberOfTickets, tokenIds);

        return tokenIds;
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
