pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../seascape_nft/SeascapeNft.sol";
import "./Crowns.sol";

/// @title Nft Swap is a part of Seascape marketplace platform.
/// It allows users to obtain desired nfts in exchange for their offered nfts + optional bounty
/// Seller has to pay a fee in order to
/// @author Nejc Schneider
contract NftSwap is IERC721Receiver,  Crowns, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Counters for Counters.Counter;


    /// @notice individual offer related data
    struct OfferObject{
        uint256 offerId;                   // offer ID
        uint8 offeredTokensAmount;         // total offered tokens
        uint8 requestedTokensAmount;       // total requested tokens
        OfferedToken [5] offeredTokens;     // offered tokens data
        RequestedToken [5] requestedTokens; // requested tokensdata
        uint256 bounty;                    // reward for the buyer
        address bountyAddress;             // currency address for paying bounties
        address payable seller;            // seller's address
        uint256 fee;                       // fee amount at the time offer was created
        bool active;                       // true = offer is open; false = offer closed
    }
    /// @notice individual offered token related data
    struct offeredToken{
        uint256 tokenId;                    // offered token id
        address tokenAddress;               // offered token address
    }
    /// @notice individual requested token related data
    struct requestedToken{
        address tokenAddress;              // requested token address
        bytes tokenParams;             // requested token Params - metadata
    }

    /// @notice enable/disable offers
    bool public tradeEnabled;
    /// @dev keep count of OfferObject amount
    uint256 public offersAmount;
    /// @dev fee for making an offer
    uint256 fee;
    /// @dev maximum amount of offered Tokens
    uint256 maxOfferedTokens;
    /// @dev maximum amount of requested Tokens
    uint256 maxrequestedTokens;

    /// @dev store offer objects.
    /// @param supportedNft address => (offerId => OfferObject)
    mapping(uint256 => OfferObject) offerObjects;
    /// @dev supported ERC721 and ERC20 contracts
    // key nftAddress value nftSwap contract address
    mapping(address => address) public supportedNftAddress;
    mapping(address => address) public swapParamsAddresses;
    mapping(address => bool) public supportedBountyAddress;

    event CreatedOffer(
        uint256 indexed offerId,
        address indexed seller,
        uint256 bounty,
        address indexed bountyAddres,
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

    /// @param _fee - fee amount
    constructor(uint256 _fee) public {
        fee = _fee;
    }

    //--------------------------------------------------
    // External methods
    //--------------------------------------------------

    /// @notice enable/disable trade
    /// @param _tradeEnabled set tradeEnabled to true/false
    function enableTrade(bool _tradeEnabled) external onlyOwner { tradeEnabled = _tradeEnabled; }

    /// @notice add supported nft contract
    /// @param _nftAddress ERC721 contract address
    function enableSupportedNftAddress(address _nftAddress, address _nftSwapAddress) external onlyOwner {
        require(_nftAddress != address(0x0), "invalid nft address");
        require(_nftSwapAddress != address(0x0), "invalid swap address");
        require(swapParamsAddresses[_nftSwapAddress] == address(0x0), "swapParamsAddress already used");
        require(supportedNftAddress[_nftAddress] == address(0x0), "nft address already enabled");
        supportedNftAddress[_nftAddress] = _nftSwapAddress;
    }

    /// @notice disable supported nft token
    /// @param _nftAddress ERC721 contract address
    function disableSupportedNftAddress(address _nftAddress) external onlyOwner {
        require(_nftAddress != address(0x0), "invalid address");
        require(supportedNftAddress[_nftAddress] != address(0), "nft address already disabled");
        delete swapParamsAddresses[supportedNftAddress[_nftAddress]]; //edit here delete syntax
        supportedNftAddress[_nftAddress] = address(0x0);
    }

    /// @notice add supported currency address for bounty
    /// @param _bountyAddress ERC20 contract address
    function addSupportedBountyAddress(address _bountyAddress) external onlyOwner {
        require(_bountyAddress != address(0x0), "invalid address");
        require(!supportedBountyAddress[_bountyAddress], "bounty already supported");
        supportedBountyAddress[_bountyAddress] = true;
    }

    /// @notice disable supported currency address for bounty
    /// @param _bountyAddress ERC20 contract address
    function removeSupportedBountyAddress(address _bountyAddress) external onlyOwner {
        require(_bountyAddress != address(0x0), "invalid address");
        require(supportedBountyAddress[_bountyAddress], "bounty already removed");
        supportedBountyAddress[_bountyAddress] = false;
    }

    /// @notice change fee amount
    /// @param _fee set fee to this value.
    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
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
    /// @param _offeredTokens array of (up to) five objects with nftData
    /// @param _requestedTokensAmount amount of required nfts
    /// @param _bounty how many cws to offer
    /// @param _bountyAddress currency address for bounty
    /// @return salesAmount total amount of sales
    function createOffer(
        uint256 _offeredTokensAmount,
        OfferedToken [5] memory _offeredTokens,
        uint256 _requestedTokensAmount,
        RequestedToken [5] memory _requestedTokens,
        uint256 _bounty,
        address _bountyAddress
    )
        public
        returns(uint)
    {
        /// declare local vars
        uint8 memory tokensCounter;

        /// require statements
        // require _offeredTokens.length == _offeredTokensAmount
        require(_offeredTokensAmount > 0, "should offer at least one nft");
        require(_offeredTokensAmount <= maxOfferedTokens, "exceeded maxOfferedTokens limit");
        // require(_offeredTokens.length == _offeredTokensAmount)
        // require _requestedTokens.length == _requestedTokensAmount
        require(_requestedTokensAmount > 0, "should require at least one nft");
        require(_requestedTokensAmount <= maxRequestedTokens, "cant exceed maxRequestedTokens");
        if (_bounty > 0)  // edit here: merge with other _bounty > 0 statements
            require(supportedBountyAddress[_bountyAddress], "bounty address not supported");


        if (_bounty > 0 && crowns.address == _bountyAddress)
            require(crowns.balanceOf(msg.sender) >= fee + _bounty, "not enough CWS to pay the fee & bounty");
            require(crowns.allowance(msg.sender, address(this)) >= fee + _bounty, "should allow spending of crowns");
        else {
            if (_bounty > 0)
                IERC20(_bountyAddress).safeTransferFrom(msg.sender, address(this), _bounty);
            crowns.transfer(address(this), obj.fee);
        }


        // todo check allowance for bounty if bounty > 0  with IERC20 variable. If they are on the same address use complex structure
        require(tradeEnabled, "trade is disabled");

        /// input token verification
        // verify offered nft oddresses and ids
        for (uint index = 0; index < _offeredTokensAmount; index++) {
            // the following checks should only apply if slot at index is filled.
            require(_offeredTokens[index].tokenId > 0, "nft id must be greater than 0");
            require(supportedNftAddress[_offeredTokens[index].tokenAddress] != address(0),
                "offered nft address unsupported");
            // edit here
            // check that msg.sender is owner
            IERC721 nft = IERC721(_offeredTokens[index].tokenAddress);
            require(nft.ownerOf(_offeredTokens[index].tokenId) == msg.sender, "sender not owner of nft");
            require(nft.isApprovedForAll(msg.sender, address(this)),  "should allow spending of nfts");
        }
        // verify requested nft oddresses
        for (uint _index = 0; _index < _requestedTokensAmount; _index++) {
            address swapParamsAddress = supportedNftAddress[_requestedTokens[index].tokenAddress];
            require(swapParamsAddress != address(0),
                "requested nft address unsupported");
            NftSwapParamsInterface requestdToken = NftSwapParamsInterface (swapParamsAddress);
            require(requestdToken.isValidParams(requestedTokens.tokenParameters), "nft parameters are invalid");
        }

        /// make transactions
        // send offered nfts to smart contract
        for (uint index = 0; index < _offeredTokensAmount; index++) {
            // send nfts to contract
            IERC721(_offeredTokens[index].tokenAddress)
                .safeTransferFrom(msg.sender, address(this), _offeredTokens[index].tokenId);
        }
        // send fee and  _bounty to contract
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
            _bounty
            fee,
            _offeredTokens[0].tokenId,
            _offeredTokens[1].tokenId,
            _offeredTokens[2].tokenId,
            _offeredTokens[3].tokenId,
            _offeredTokens[4].tokenId
            // edit: requestedAmount,  offeredAmount
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
        require(tradeEnabled, "trade is disabled");
        require(obj.active, "offer canceled or sold");
        require(_requestedTokensAmount == obj.requestedTokensAmount);
        require(msg.sender != obj.seller, "cant buy self-made offer");


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
        // edit here
        emit AcceptedOffer(
            obj.offerId,
            msg.sender,
            obj.bounty,
            obj.bountyAddress,
            obj.fee,
            _requestedTokenIds [5]
        );
    }

    /// @notice cancel the offer
    /// @param _tokenId nft unique ID
    /// @param _nftAddress nft token address
    function CancelOffer(uint _offerId) public {
        OfferObject storage obj = offerObjects[_offerId];
        require(obj.active, "offer already closed");
        require(obj.seller == msg.sender, "sender not author of offer");
        require(tradeEnabled, "trade is disabled");

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
        // edit here
        emit CanceledOffer(
            obj.offerId,
            obj.bounty,
            obj.fee,
            _offeredTokens[0].tokenId,
            _offeredTokens[1].tokenId,
            _offeredTokens[2].tokenId,
            _offeredTokens[3].tokenId,
            _offeredTokens[4].tokenId
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
