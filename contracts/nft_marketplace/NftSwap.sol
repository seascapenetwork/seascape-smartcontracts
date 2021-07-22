pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../seascape_nft/SeascapeNft.sol";
import "./Crowns.sol";

/// @title Nft Swap is a part of Seascape marketplace platform.
/// It allows users to obtain desired nfts in exchange for their offered nfts,
/// fee and an optional bounty
/// @author Nejc Schneider
contract NftSwap is Crowns, Ownable, IERC721Receiver {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    SeascapeNft private nft;


    /// @notice individual offer related data
    struct OfferObject{
        uint256 offerId;                   // offer ID
        uint8 offeredTokensAmount;         // total offered tokens
        uint8 requestedTokensAmount;       // total requested tokens
        OfferedToken [5] offeredTokens;    // offered tokens data
        RequestedToken [5] requestedTokens;// requested tokensdata
        uint256 bounty;                    // reward for the buyer
        address bountyAddress;             // currency address for paying bounties
        address payable seller;            // seller's address
        uint256 fee;                       // fee amount at the time offer was created
    }
    /// @notice individual offered token related data
    struct offeredToken{
        uint256 tokenId;                    // offered token id
        address tokenAddress;               // offered token address
    }
    /// @notice individual requested token related data
    struct requestedToken{
        address tokenAddress;              // requested token address
        bytes tokenParams;                 // requested token Params - metadata
    }


    /// @dev keep count of OfferObject amount
    uint256 offersAmount;
    /// @notice enable/disable offers
    bool public tradeEnabled;
    /// @dev fee for making an offer
    uint256 public fee;
    /// @dev maximum amount of offered Tokens
    uint256 public maxOfferedTokens;
    /// @dev maximum amount of requested Tokens
    uint256 public maxRequestedTokens;

    /// @dev store offer objects.
    /// @param offerId => OfferObject
    mapping(uint256 => OfferObject) offerObjects;
    /// @dev supported ERC721 and ERC20 contracts
    /// @param nftAddress => nftSwapParams contract address
    mapping(address => address) public nftSwapParamsAddresses;
    mapping(address => bool) public supportedBountyAddresses;
    mapping(address => address) public supportedNftAddresses;

    event CreatedOffer(
        uint256 indexed offerId,
        address indexed seller,
        uint256 bounty,
        address indexed bountyAddress,
        uint256 fee,
        uint256 offeredTokensAmount,
        uint256 requestedTokensAmount,
        uint256 [5] offeredTokenIds,
        uint256 [5] requestedTokens
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

    /// @param _feeAmount - fee amount
    /// @param _crownsAddress staking currency address
    /// @param _nftAddress initial nft collection token address (Scapes)
    constructor(uint256 _feeAmount, address _crownsAddress, address _nftAddress) public {
        /// @dev set crowns is defined in Crowns.sol
        setCrowns(_crownsAddress);
        nft = SeascapeNft(_nftAddress);
        fee = _feeAmount;
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
    function enableSupportedNftAddresses(
        address _nftAddress,
        address _nftSwapParamsAddress
    )
        external
        onlyOwner
    {
        require(_nftAddress != address(0x0), "invalid nft address");
        require(_nftSwapParamsAddress != address(0x0), "invalid nftSwapParams address");
        require(nftSwapParamsAddresses[_nftSwapParamsAddress] == address(0x0),
            "swapParams address already used");
        require(supportedNftAddresses[_nftAddress] == address(0x0),
            "nft address already enabled");
        supportedNftAddresses[_nftAddress] = _nftSwapParamsAddress;
    }

    /// @notice disable supported nft token
    /// @param _nftAddress ERC721 contract address
    function disableSupportedNftAddresses(address _nftAddress) external onlyOwner {
        require(_nftAddress != address(0x0), "invalid address");
        require(supportedNftAddresses[_nftAddress] != address(0),
            "nft address already disabled");
        delete nftSwapParamsAddresses[supportedNftAddresses[_nftAddress]];
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
    /// @param _feeAmount set fee to this value.
    function setFee(uint256 _feeAmount) external onlyOwner {
        fee = _feeAmount;
    }

    /// @notice returns amount of offers
    /// @return total amount of offer objects
    function getOffersAmount() external view returns(uint) { return offersAmount; }

    /// @notice change max amount of nfts seller can offer
    /// @param _amount desired limit should be in range 1 - 5
    function setMaxOfferedTokens (uint256 _amount) external onlyOwner {
        require(_amount > 0, "amount should be at least 1");
        require(_amount < 6, "amount should be 5 or less");
        maxOfferedTokens = _amount;
    }

    /// @notice change max amount of nfts seller can request
    /// @param _amount desired limit should be in range 1 - 5
    function setMaxRequestedTokens  (uint256 _amount) external onlyOwner {
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
    /// @return offersAmount total amount of offers
    function createOffer(
        uint256 _offeredTokensAmount,
        OfferedToken [5] memory _offeredTokens,
        uint256 _requestedTokensAmount,
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
            if (crowns.address == _bountyAddress) {
                require(crowns.balanceOf(msg.sender) >= fee + _bounty,
                    "not enough CWS for fee & bounty");
                require(crowns.allowance(msg.sender, address(this)) >= fee + _bounty,
                    "should allow spending of crowns");
            } else {
                require(supportedBountyAddresses[_bountyAddress],
                    "bounty address not supported");
                IERC20 currency = IERC20(_bountyAddress);
                require(currency.balanceOf(msg.sender) >= _bounty,
                    "not enough money to pay bounty");
                require(currency.allowance(msg.sender, address(this)) >= _bounty,
                    "should allow spending of bounty");
                require(crowns.balanceOf(msg.sender) >= fee, "not enough CWS for fee");
                require(crowns.allowance(msg.sender, address(this)) >= fee,
                    "should allow spending of crowns");
            }
        } else {
            require(crowns.balanceOf(msg.sender) >= fee,
                "not enough CWS for fee");
            require(crowns.allowance(msg.sender, address(this)) >= fee,
                "should allow spending of crowns");
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
            require(nft.isApprovedForAll(msg.sender, address(this)),
                "should allow spending of nfts");
        }
        // verify requested nft oddresses
        for (uint _index = 0; _index < _requestedTokensAmount; _index++) {
            address swapParamsAddress = supportedNftAddresses[_requestedTokens[index].tokenAddress];
            require(swapParamsAddress != address(0),
                "requested nft address unsupported");
            // edit here -> move signature here
            NftSwapParamsInterface requestdToken = NftSwapParamsInterface (swapParamsAddress);
            require(requestdToken.isValidParams(requestedTokens.tokenParameters),
                "nft parameters are invalid");
        }

        /// make transactions
        // send offered nfts to smart contract
        for (uint index = 0; index < _offeredTokensAmount; index++) {
            // send nfts to contract
            IERC721(_offeredTokens[index].tokenAddress)
                .safeTransferFrom(msg.sender, address(this), _offeredTokens[index].tokenId);
        }
        // send fee and _bounty to contract
        if (_bounty > 0 && crowns.address == _bountyAddress)
            crowns.transfer(address(this), obj.fee + _bounty);
        else {
            if (_bounty > 0)
                IERC20(_bountyAddress).safeTransferFrom(msg.sender, address(this), _bounty);
            crowns.transfer(address(this), obj.fee);
        }

        /// update states
        offersAmount.increment();

        offerObjects[offersAmount] = OfferObject(
            offersAmount,
            _offeredTokensAmount,
            _requestedTokensAmount,
            _offeredTokens [5],
            _requestedTokens [5],
            _bounty,
            _bountyAddress,
            msg.sender,
            fee,
            true
        );

        /// emit events
        emit CreatedOffer(
            offersAmount,
            msg.sender,
            _bounty,
            _bountyAddress,
            fee,
            _offeredTokensAmount,
            _requestedTokensAmount,
            _offeredTokens[0].tokenId,
            _offeredTokens[1].tokenId,
            _offeredTokens[2].tokenId,
            _offeredTokens[3].tokenId,
            _offeredTokens[4].tokenId,
            _requestedTokens [5],
          );

        return offersAmount;
    }

    /// @notice make a trade
    /// @param _offerId offer unique ID
    /// @param _nftAddress nft token address
    function acceptOffer(
        uint256 _offerId,
        uint256 _requestedTokensAmount,
        uint256 _requestedTokenIds [5],
        uint256 _requestedTokenAddress [5],
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        public
        nonReentrant
        payable
    {
        OfferObject storage obj = offerObjects[_offerId];
        // edit here: check that obj at index (still) exists ^^
        require(tradeEnabled, "trade is disabled");
        require(obj.active, "offer canceled or sold");
        require(_requestedTokensAmount == obj.requestedTokensAmount);
        require(msg.sender != obj.seller, "cant buy self-made offer");
        // edit here: require requestedToken. id>0, ownerOf, isApproved, tokenAddress

        /// digital signature part
        /// @dev make sure that signature of nft matches with the address of the contract deployer
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
            _offerId,
            _requestedTokensAmount,
            _requestedTokenIds [5],
            _requestedTokenAddress [5]
        ));
        bytes32 _message = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32", _messageNoPrefix));
        address _recover = ecrecover(_message, _v, _r, _s);
        require(_recover == owner(),  "Verification failed");

        /// make transactions
        // send requestedTokens from buyer to seller
        for (uint index = 0; index < obj.requestedTokensAmount; index++) {
            require(_requestedTokenAddress[index] == obj.requestedTokens[index].tokenAddress,
                "wrong requested token address");
            IERC721(_requestedTokenAddress[index])
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
        delete obj;

        /// emit events
        emit AcceptedOffer(
            obj.offerId,
            msg.sender,
            obj.bounty,
            obj.bountyAddress,
            obj.fee,
            _requestedTokensAmount,
            _requestedTokenIds [5],
            obj.offeredTokensAmount,
            obj.offeredTokenIds [5]
        );
    }

    /// @notice cancel the offer
    /// @param _tokenId nft unique ID
    function CancelOffer(uint _offerId) public {
        OfferObject storage obj = offerObjects[_offerId];
        // edit here: check that obj at index (still) exists ^^
        require(obj.seller == msg.sender, "sender not author of offer");

        /// make transactions
        // send the offeredTokens from SC to seller
        for (uint index=0; index < obj.offeredTokensAmount; index++) {
            IERC721(obj.offeredTokens[index].tokenAddress)
                .safeTransferFrom(msg.sender, obj.seller, obj.offeredTokens[index].tokenId);
        }
        // send crowns and bounty from SC to seller
        if (obj.bounty > 0 && crowns.address == obj.bountyAddress)
            crowns.transferFrom(address(this), msg.sender, obj.fee + obj.bounty);
        else {
            if (obj.bounty > 0)
                IERC20(_bountyAddress).safeTransferFrom(address(this), msg.sender, _bounty);
            crowns.transferFrom(address(this), msg.sender, obj.fee);
        }

        /// update states
        delete obj;

        /// emit events
        emit CanceledOffer(
            obj.offerId,
            obj.seller
        );
    }


    /// @dev fetch offer object at offerId and nftAddress
    /// @param _offerId unique offer ID
    /// @param _nftAddress nft token address
    /// @return OfferObject at given index
    function getOffer(uint _offerId)
        public
        view
        returns(OfferObject memory)
    {
        return offerObjects[_offerId];
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
