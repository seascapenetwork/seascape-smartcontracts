pragma solidity 0.6.7;
pragma experimental ABIEncoderV2;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Crowns.sol";
import "./NftSwapParamsInterface.sol";

/// @title Nft Swap is a part of Seascape marketplace platform.
/// It allows users to obtain desired nfts in exchange for their offered nfts,
/// a fee and an optional bounty
/// @author Nejc Schneider
contract NftSwap is Crowns, Ownable, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;



    /// @notice individual offer related data
    struct OfferObject{
        uint256 offerId;                   // offer ID
        uint8 offeredTokensAmount;         // total offered tokens
        uint8 requestedTokensAmount;       // total requested tokens
        uint256 bounty;                    // reward for the buyer
        address bountyAddress;             // currency address for paying bounties
        address payable seller;            // seller's address
        uint256 fee;                       // fee amount at the time offer was created
        mapping(uint256 => OfferedToken) offeredTokens;       // offered tokens data
        mapping(uint256 => RequestedToken) requestedTokens;   // requested tokensdata
    }
    /// @notice individual offered token related data
    struct OfferedToken{
        uint256 tokenId;                    // offered token id
        address tokenAddress;               // offered token address
    }
    /// @notice individual requested token related data
    struct RequestedToken{
        address tokenAddress;              // requested token address
        bytes tokenParams;                 // requested token Params - metadata
        uint8 v;
        bytes32 r;
        bytes32 s;
    }


    /// @dev keep count of offers (aka offerIds)
    uint256 public lastOfferId;
    /// @notice enable/disable creating and accepting offer.
    bool public tradeEnabled;
    /// @dev fee for creating an offer
    uint256 public fee;
    /// @dev maximum amount of offered Tokens
    uint256 public maxOfferedTokens = 5;
    /// @dev maximum amount of requested Tokens
    uint256 public maxRequestedTokens = 5;

    /// @dev store offer objects.
    /// @param offerId => OfferObject
    mapping(uint256 => OfferObject) offerObjects;
    /// @dev supported ERC721 and ERC20 contracts
    mapping(address => bool) public supportedBountyAddresses;
    /// @dev parse metadata contract addresses (1 per individual nftSeries)
    /// @param nftAddress => nftSwapParams contract address
    mapping(address => address) public supportedNftAddresses;

    event CreatedOffer(
        uint256 indexed offerId,
        address indexed seller,
        uint256 bounty,
        address indexed bountyAddress,
        uint256 fee,
        uint256 offeredTokensAmount,
        uint256 requestedTokensAmount,
        OfferedToken [5] offeredTokens,
        RequestedToken [5] requestedTokens
    );
    event AcceptedOffer(
        uint256 indexed offerId,
        address indexed buyer,
        uint256 bounty,
        address indexed bountyAddress,
        uint256 fee,
        uint256 requestedTokensAmount,
        uint256 [5] requestedTokenIds,
        uint256 offeredTokensAmount,
        uint256 [5] offeredTokenIds
    );
    event CanceledOffer(
        uint256 indexed offerId,
        address indexed seller
    );
    event NftReceived(address operator, address from, uint256 tokenId, bytes data);

    /// @param _feeRate - fee amount
    /// @param _crownsAddress staking currency address
    constructor(uint256 _feeRate, address _crownsAddress) public {
        /// @dev set crowns is defined in Crowns.sol
        require(_crownsAddress != address(0x0), "invalid cws address");
        setCrowns(_crownsAddress);
        fee = _feeRate;
    }

    //--------------------------------------------------
    // External methods
    //--------------------------------------------------

    /// @notice enable/disable trade
    /// @param _tradeEnabled set tradeEnabled to true/false
    function enableTrade(bool _tradeEnabled) external onlyOwner { tradeEnabled = _tradeEnabled; }

    /// @notice add supported nft contract
    /// @param _nftAddress ERC721 contract address
    // @param _nftSwapParams contract address
    function enableSupportedNftAddress(
        address _nftAddress,
        address _nftSwapParamsAddress
    )
        external
        onlyOwner
    {
        require(_nftAddress != address(0x0), "invalid nft address");
        require(_nftSwapParamsAddress != address(0x0), "invalid nftSwapParams address");
        require(supportedNftAddresses[_nftAddress] == address(0x0),
            "nft address already enabled");
        supportedNftAddresses[_nftAddress] = _nftSwapParamsAddress;
    }

    /// @notice disable supported nft token
    /// @param _nftAddress ERC721 contract address
    function disableSupportedNftAddress(address _nftAddress) external onlyOwner {
        require(_nftAddress != address(0x0), "invalid address");
        require(supportedNftAddresses[_nftAddress] != address(0),
            "nft address already disabled");
        supportedNftAddresses[_nftAddress] = address(0x0);
    }

    /// @notice add supported currency address for bounty
    /// @param _bountyAddress ERC20 contract address
    function addSupportedBountyAddresses(address _bountyAddress) external onlyOwner {
        require(_bountyAddress != address(0x0), "invalid address");
        require(!supportedBountyAddresses[_bountyAddress], "bounty already supported");
        supportedBountyAddresses[_bountyAddress] = true;
    }

    /// @notice disable supported currency address for bounty
    /// @param _bountyAddress ERC20 contract address
    function removeSupportedBountyAddresses(address _bountyAddress) external onlyOwner {
        require(_bountyAddress != address(0x0), "invalid address");
        require(supportedBountyAddresses[_bountyAddress], "bounty already removed");
        supportedBountyAddresses[_bountyAddress] = false;
    }

    /// @notice change fee amount
    /// @param _feeRate set fee to this value.
    function setFee(uint256 _feeRate) external onlyOwner { fee = _feeRate; }

    /// @notice returns amount of offers
    /// @return total amount of offer objects
    function getLastOfferId() external view returns(uint) { return lastOfferId; }

    /// @notice change max amount of nfts seller can offer
    /// @param _amount desired limit should be in range 1 - 5
    function setOfferedTokensAmount (uint256 _amount) external onlyOwner {
        require(_amount > 0, "amount should be at least 1");
        require(_amount < 6, "amount should be 5 or less");
        maxOfferedTokens = _amount;
    }

    /// @notice change max amount of nfts seller can request
    /// @param _amount desired limit should be in range 1 - 5
    function setRequestedTokensAmount  (uint256 _amount) external onlyOwner {
        require(_amount > 0, "amount should be at least 1");
        require(_amount < 6, "amount should be 5 or less");
        maxRequestedTokens = _amount;
    }

    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

    /// @notice create a new offer
    /// @param _offeredTokensAmount how many nfts to offer
    /// @param _offeredTokens array of five OfferedToken structs
    /// @param _requestedTokensAmount amount of required nfts
    /// @param _requestedTokens array of five RequestedToken structs
    /// @param _bounty additional cws to offer to buyer
    /// @param _bountyAddress currency contract address for bounty
    /// @return lastOfferId total amount of offers
    function createOffer(
        uint8 _offeredTokensAmount,
        OfferedToken [5] memory _offeredTokens,
        uint8 _requestedTokensAmount,
        RequestedToken [5] memory _requestedTokens,
        uint256 _bounty,
        address _bountyAddress
    )
        public
        returns(uint256)
    {
        /// require statements
        require(_offeredTokensAmount > 0, "should offer at least one nft");
        require(_offeredTokensAmount <= maxOfferedTokens, "exceeded maxOfferedTokens limit");
        require(_requestedTokensAmount > 0, "should require at least one nft");
        require(_requestedTokensAmount <= maxRequestedTokens, "cant exceed maxRequestedTokens");
        // bounty & fee related requirements
        if (_bounty > 0) {
            if (address(crowns) == _bountyAddress) {
                require(crowns.balanceOf(msg.sender) >= fee + _bounty,
                    "not enough CWS for fee & bounty");
            } else {
                require(supportedBountyAddresses[_bountyAddress],
                    "bounty address not supported");
                IERC20 currency = IERC20(_bountyAddress);
                require(currency.balanceOf(msg.sender) >= _bounty,
                    "not enough money to pay bounty");
                require(crowns.balanceOf(msg.sender) >= fee, "not enough CWS for fee");
            }
        } else {
            require(crowns.balanceOf(msg.sender) >= fee, "not enough CWS for fee");
        }
        require(tradeEnabled, "trade is disabled");
        /// input token verification
        // verify offered nft oddresses and ids
        for (uint index = 0; index < _offeredTokensAmount; index++) {
            // the following checks should only apply if slot at index is filled.
            require(_offeredTokens[index].tokenId > 0, "nft id must be greater than 0");
            require(supportedNftAddresses[_offeredTokens[index].tokenAddress] != address(0),
                "offered nft address unsupported");
            IERC721 nft = IERC721(_offeredTokens[index].tokenAddress);
            require(nft.ownerOf(_offeredTokens[index].tokenId) == msg.sender,
                "sender not owner of nft");
        }
        // verify requested nft oddresses
        for (uint _index = 0; _index < _requestedTokensAmount; _index++) {
            address swapParamsAddress = supportedNftAddresses[_requestedTokens[_index].tokenAddress];
            require(swapParamsAddress != address(0),
                "requested nft address unsupported");
            // verify nft parameters
            NftSwapParamsInterface requestedToken = NftSwapParamsInterface (swapParamsAddress);
            require(requestedToken.isValidParams(lastOfferId, _requestedTokens[_index].tokenParams,
              _requestedTokens[_index].v, _requestedTokens[_index].r, _requestedTokens[_index].s),
                "required nft params are invalid");
        }

        /// make transactions
        // send offered nfts to smart contract
        for (uint index = 0; index < _offeredTokensAmount; index++) {
            // send nfts to contract
            IERC721(_offeredTokens[index].tokenAddress)
                .safeTransferFrom(msg.sender, address(this), _offeredTokens[index].tokenId);
        }
        // send fee and _bounty to contract
        if (_bounty > 0 && address(crowns) == _bountyAddress)
            IERC20(crowns).safeTransferFrom(msg.sender, address(this), fee + _bounty);
        else {
            if (_bounty > 0)
                IERC20(_bountyAddress).safeTransferFrom(msg.sender, address(this), _bounty);
            IERC20(crowns).safeTransferFrom(msg.sender, address(this), fee);
        }

        /// update states
        lastOfferId++;

        offerObjects[lastOfferId].offerId = lastOfferId;
        offerObjects[lastOfferId].offeredTokensAmount = _offeredTokensAmount;
        offerObjects[lastOfferId].requestedTokensAmount = _requestedTokensAmount;
        for(uint256 i = 0; i < _offeredTokensAmount; i++){
            offerObjects[lastOfferId].offeredTokens[i] = _offeredTokens[i];
        }
        for(uint256 i = 0; i < _requestedTokensAmount; i++){
            offerObjects[lastOfferId].requestedTokens[i] = _requestedTokens[i];
        }
        offerObjects[lastOfferId].bounty = _bounty;
        offerObjects[lastOfferId].bountyAddress = _bountyAddress;
        offerObjects[lastOfferId].seller = msg.sender;
        offerObjects[lastOfferId].fee = fee;

        /// emit events
        emit CreatedOffer(
            lastOfferId,
            msg.sender,
            _bounty,
            _bountyAddress,
            fee,
            _offeredTokensAmount,
            _requestedTokensAmount,
            _offeredTokens,
            _requestedTokens
          );

        return lastOfferId;
    }

    /// @notice make a trade
    /// @param _offerId offer unique ID
    function acceptOffer(
        uint256 _offerId,
        uint256 [5] memory _requestedTokenIds,
        address [5] memory _requestedTokenAddresses,
        uint8 [5] memory _v,
        bytes32 [5] memory _r,
        bytes32 [5] memory _s
    )
        public
        nonReentrant
        payable
    {
        OfferObject storage obj = offerObjects[_offerId];
        require(tradeEnabled, "trade is disabled");
        require(msg.sender != obj.seller, "cant buy self-made offer");

        /// @dev verify requested tokens
        for(uint256 i = 0; i < obj.requestedTokensAmount; i++){
            require(_requestedTokenIds[i] > 0, "nft id must be greater than 0");
            require(_requestedTokenAddresses[i] == obj.requestedTokens[i].tokenAddress,
                "wrong requested token address");
            IERC721 nft = IERC721(obj.requestedTokens[i].tokenAddress);
            require(nft.ownerOf(_requestedTokenIds[i]) == msg.sender,
                "sender not owner of nft");
            /// digital signature part
            bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
                _offerId,
                msg.sender,
                _requestedTokenIds[i],
                _requestedTokenAddresses[i]

            ));
            bytes32 _message = keccak256(abi.encodePacked(
                "\x19Ethereum Signed Message:\n32", _messageNoPrefix));
            address _recover = ecrecover(_message, _v[i], _r[i], _s[i]);
            require(_recover == owner(),  "Verification failed");
        }

        /// make transactions
        // send requestedTokens from buyer to seller
        for (uint index = 0; index < obj.requestedTokensAmount; index++) {
            IERC721(_requestedTokenAddresses[index])
                .safeTransferFrom(msg.sender, obj.seller, _requestedTokenIds[index]);
        }
        // send offeredTokens from SC to buyer
        for (uint index = 0; index < obj.offeredTokensAmount; index++) {
            IERC721(obj.offeredTokens[index].tokenAddress)
                .safeTransferFrom(address(this), msg.sender, obj.offeredTokens[index].tokenId);
        }
        // spend obj.fee and send obj.bounty from SC to buyer
        crowns.spend(obj.fee);
        if(obj.bounty > 0)
            IERC20(obj.bountyAddress).safeTransfer(msg.sender, obj.bounty);

        /// update states
        delete offerObjects[_offerId];

        /// emit events
        emit AcceptedOffer(
            obj.offerId,
            msg.sender,
            obj.bounty,
            obj.bountyAddress,
            obj.fee,
            obj.requestedTokensAmount,
            _requestedTokenIds,
            obj.offeredTokensAmount,
            [obj.offeredTokens[0].tokenId,
            obj.offeredTokens[1].tokenId,
            obj.offeredTokens[2].tokenId,
            obj.offeredTokens[3].tokenId,
            obj.offeredTokens[4].tokenId]
        );
    }

    /// @notice cancel the offer
    /// @param _offerId offer unique ID
    function cancelOffer(uint _offerId) public {
        OfferObject storage obj = offerObjects[_offerId];
        require(obj.seller == msg.sender, "sender is not creator of offer");

        /// make transactions
        // send the offeredTokens from SC to seller
        for (uint index=0; index < obj.offeredTokensAmount; index++) {
            IERC721(obj.offeredTokens[index].tokenAddress)
                .safeTransferFrom(address(this), obj.seller, obj.offeredTokens[index].tokenId);
        }

        // send crowns and bounty from SC to seller
        if (obj.bounty > 0 && address(crowns) == obj.bountyAddress)
            crowns.transfer(msg.sender, obj.fee + obj.bounty);
        else {
            if (obj.bounty > 0){
                IERC20(obj.bountyAddress).safeTransfer(msg.sender, obj.bounty);
              }
              crowns.transfer(msg.sender, obj.fee);
        }

        /// update states
        delete offerObjects[_offerId];

        /// emit events
        emit CanceledOffer(
            obj.offerId,
            obj.seller
        );
    }

    /// @dev fetch offer object at offerId and nftAddress
    /// @param _offerId unique offer ID
    /// @return OfferObject at given index
    function getOffer(uint _offerId)
        external
        view
        returns(uint256, uint8, uint8, uint256, address, address, uint256)
    {
        return (
        offerObjects[_offerId].offerId,
        offerObjects[_offerId].offeredTokensAmount,
        offerObjects[_offerId].requestedTokensAmount,
        offerObjects[_offerId].bounty,
        offerObjects[_offerId].bountyAddress,
        offerObjects[_offerId].seller,
        offerObjects[_offerId].fee
        );
    }

    /// @dev encrypt token data
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    )
        public
        override
        returns (bytes4)
    {
        //only receive the _nft staff
        if (address(this) != operator) {
            //invalid from nft
            return 0;
        }

        //success
        emit NftReceived(operator, from, tokenId, data);
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

}
