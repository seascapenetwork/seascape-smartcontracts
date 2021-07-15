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
contract NftMarket is IERC721Receiver,  Crowns, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Counters for Counters.Counter;


    /// @notice individual offer related data
    struct OfferObject{
        uint256 offerId;                   // offer ID
        uint8 offeredTokensAmount;         // sum of offered tokens
        OfferedToken[5] offeredTokens;     // offered tokens data
        RequestedToken[5] requestedTokens; // requested tokensdata
        uint256 bounty;                    // reward for the buyer
        address currency;                  // currency is used both for offerFee and bounty
        address payable seller;            // seller's address
        uint256 swapFee;                   // amount of fee at the time offer was created
        bool active;                       // true = offer is open; false = offer canceled or accepted
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
    uint256 swapFee;
    /// @dev maximum amount of offered Tokens
    uint256 maxOfferedTokens;
    /// @dev maximum amount of requested Tokens
    uint256 maxRequestdTokens;

    /// @dev store offer objects.
    /// @param supportedNft address => (offerId => OfferObject)
    mapping(address => mapping(uint256 => OfferObject)) offerObjects;
    /// @dev supported ERC721 and ERC20 contracts
    mapping(address => bool) public supportedNft;
    mapping(address => bool) public supportedCurrency;

    event Offer(
        uint256 indexed offerId,
        address seller,
        uint256 swapFee,
        uint256 [5] offeredTokenIds,
    );
    event AcceptOffer(
        uint256 indexed offerId,
        address buyer,
        uint256 bounty,
        address currency,
    );
    event CancelOffer(uint256 indexed offerId);
    event NftReceived(address operator, address from, uint256 tokenId, bytes data);

    /// @param _swapFee - fee amount
    constructor(uint256 _swapFee) public {
        swapFee = _swapFee;
    }

    //--------------------------------------------------
    // External methods
    //--------------------------------------------------

    /// @notice enable/disable offers
    /// @param _tradeEnabled set tradeEnabled to true/false
    function enableSales(bool _tradeEnabled) external onlyOwner { tradeEnabled = _tradeEnabled; }

    /// @notice add supported nft token
    /// @param _nftAddress ERC721 contract address
    function addSupportedNft(address _nftAddress) external onlyOwner {
        require(_nftAddress != address(0x0), "invalid address");
        supportedNft[_nftAddress] = true;
    }

    /// @notice disable supported nft token
    /// @param _nftAddress ERC721 contract address
    function removeSupportedNft(address _nftAddress) external onlyOwner {
        require(_nftAddress != address(0x0), "invalid address");
        supportedNft[_nftAddress] = false;
    }

    /// @notice add supported currency token
    /// @param _currencyAddress ERC20 contract address
    function addSupportedCurrency(address _currencyAddress) external onlyOwner {
        require(_currencyAddress != address(0x0), "invalid address");
        require(!supportedCurrency[_currencyAddress], "currency already supported");
        supportedCurrency[_currencyAddress] = true;
    }

    /// @notice disable supported currency token
    /// @param _currencyAddress ERC20 contract address
    function removeSupportedCurrency(address _currencyAddress) external onlyOwner {
        require(_currencyAddress != address(0x0), "invalid address");
        require(supportedCurrency[_currencyAddress], "currency already removed");
        supportedCurrency[_currencyAddress] = false;
    }

    /// @notice change fee rate
    /// @param _rate amount value. Actual rate in percent = _rate / 10
    function setswapFee(uint256 _swapFee) external onlyOwner {
        swapFee = _swapFee;
    }

    /// @notice returns amount of offers
    /// @return total amount of offer objects
    function getOffersAmount() external view returns(uint) { return offersAmount; }

    /// @notice change max amount of nfts seller can offer
    /// @param _amount desired limit should be in range 1 - 5
    function setMaxOfferedTokens (uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount should be at least 1");
        require(_amount < 6, "Amount should be 5 or less");
        maxOfferedTokens = _amount;
    }

    /// @notice change max amount of nfts seller can request
    /// @param _amount desired limit should be in range 1 - 5
    function setMaxRequestdTokens  (uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount should be at least 1");
        require(_amount < 6, "Amount should be 5 or less");
        maxRequestedTokens = _amount;
    }

    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

    /// @notice create a new offer
    /// @param _offeredTokensAmount how many nfts to offer
    /// @param _offeredTokens array of (up to) five objects with nftData
    /// @param _requestdTokensAmount amount of required nfts
    /// @param _bounty how many cws to offer
    /// @param _currency cws (or other currency) token address
    /// @return salesAmount total amount of sales
    function offer(
        uint256 _offeredTokensAmount,
        OfferedToken [5] memory _offeredTokens,
        uint256 _requestdTokensAmount,
        RequestedToken [5] memory _requestedTokens,
        uint256 _bounty,
        address _currency
    )
        public
        returns(uint)
    {
        /// require statements
        require(tradeEnabled, "trade is disabled");
        require(supportedCurrency[_currency], "currency not supported");
        require(_offeredTokensAmount > 0, "Should offer at least one nft");
        require(_offeredTokensAmount <= maxOfferedTokens, "Should not offer more than maxOfferedTokens");
        require(_requestdTokensAmount > 0, "Should require at least one nft");
        require(_requestdTokensAmount <= maxRequestedTokens, "Should not require more than maxRequestedTokens")

        // verify offered nft oddresses and ids
        for (uint index=0; index < maxOfferedTokens; index++) {
            // edit here
            // the following checks should only apply if slot at index is filled
            require(_offeredTokens[index].tokenId > 0, "Nft id must be greater than 0");
            require(supportedNft[_offeredTokens[index].tokenAddress], "Offered nft address unsupported");
        }


        // verify requested nft oddresses and parameters
        for (uint _index=0; _index < maxOfferedTokens; _index++) {
            // edit here
            // the following checks should only apply if slot at index is filled
            require(supportedNft[_requestedTokens[index].tokenAddress], "requested nft address unsupported");
            // edit here
            // NftSwapParams part
            swapParamsInterface requestdToken = new swapParamsInterface (requestdTokens.tokenAddress)
            require(call requestdToken.isValidParams(requestdTokens.tokenParameters)
        }


        /// make transactions
        // send 1-5 nfts to smart contract
        for (uint index=0; index < maxOfferedTokens; index++) {
            // edit here
            // if there is no nft at index, loop should break.
            // if(_offeredTokens[index] == null)
            //    break;
            // send nfts to contract
            IERC721(_nftAddress).safeTransferFrom(msg.sender, address(this), _offeredTokens[index].tokenId);
        }

        // send swapFee + _bounty to contract
        IERC20(_currency).safeTransferFrom(msg.sender, address(this), swapFee + _bounty);


        /// update states

        offersAmount.increment();

        offerObjects[_nftAddress][offersAmount] = OfferObject(
            offersAmount,
            _offeredTokensAmount,
            _offeredTokens[5], // edit here
            _requestedTokens[5], // edit here
            _bounty,
            _currency,
            msg.sender,
            swapFee,
            true
        );

        /// emit events

        // edit here
        emit Offer(
            offersAmount,
            msg.seller,
            swapFee,
            _offeredTokens[0].tokenId,
            _offeredTokens[1].tokenId,
            _offeredTokens[2].tokenId,
            _offeredTokens[3].tokenId,
            _offeredTokens[4].tokenId
          );

        return offersAmount;
    }

    /// @notice make a trade
    /// @param _offerId offer unique ID
    /// @param _nftAddress nft token address
    /// @param _currency currency token address
    function acceptOffer(
        uint256 _offerId,
        uint256 _requestdTokensAmount,
        uint256 _requestedTokenIds [5],
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        public
        nonReentrant
        payable
    {
        OfferObject storage obj = offerObjects[_nftAddress][_offerId];

        /// require statements
        require(tradeEnabled, "trade is disabled");
        require(obj.active, "offer canceled or sold");
        // require(msg.sender != obj.seller, "cant buy self-made offer");

        // require that requested nfts are owned by buyer
        // require digital signature part verified



        /// digital signature part

        /// make transactions
        // send 1-5 requestedTokens from SC to buyer
        for (uint index=0; index < obj.requestedTokensAmount; index++) {
            // edit here
            // we dont have the tokenId field on requestedToken !
            IERC721(_nftAddress).safeTransferFrom(address(this), obj.seller, _requestedTokens[index].tokenId);

            IERC721 nft = IERC721(obj.nft);
            nft.safeTransferFrom(address(this), msg.sender, obj.tokenId);
        }


        // send obj.fee to


        crowns.spend(obj.offerFee);
        if(obj.currency == crowns)

        else
            // send bounty from SC to buyer
            IERC20(obj.currency).safeTransfer(msg.sender, obj.bounty);
            safeTransfer(IERC20 token, address to, uint256 value)
            //send nfts from buyer to seller
            //spend feeAmount with crowns.spend()



        /* IERC721 nft = IERC721(obj.nft);
        nft.safeTransferFrom(address(this), msg.sender, obj.tokenId); */

        /// update states
        obj.active = false;

        /// emit events
        emit AcceptOffer();
    }

    /// @notice cancel the offer
    /// @param _tokenId nft unique ID
    /// @param _nftAddress nft token address
    function cancelOffer(uint _offerId, address _nftAddress) public {
        OfferObject storage obj = offerObjects[_nftAddress][_offerId];
        require(tradeEnabled, "trade is disabled");
        // require offer.seller to be msg.sender

        emit OfferCanceled();
    }


    /// @dev fetch offer object at offerId and nftAddress
    /// @param _offerId unique offer ID
    /// @param _nftAddress nft token address
    /// @return OfferObject at given index
    function getOffer(uint _offerId, address _nftAddress)
        public
        view
        returns(OfferObject memory)
    {
        return offerObjects[_nftAddress][_offerId];
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
