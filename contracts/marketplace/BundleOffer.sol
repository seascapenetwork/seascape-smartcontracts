pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/security/ReentrancyGuard.sol";


/// @title Bundle Offer is a part of Seascape marketplace platform.
/// Users can sell up to 20 nfts in exchange for ERC20
/// @author Nejc Schneider
contract BundleOffer is IERC721Receiver, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint public lastOfferId;
    bool public tradeEnabled = true;
    uint public feeRate;     // 5 = 0.5%; 100 = 10%
    address payable private feeReceiver;

    struct OfferObject {
        uint offerId;
        uint price;
        uint nftsAmount;
        uint fee;     // value is saved at createOffer() and used at acceptOffer()
        address payable seller;
        address currency;
        mapping(uint => OfferedNft) offeredNfts;
    }

    struct OfferedNft{
        uint nftId;
        address nftAddress;
    }

    /// @param offerId => OfferObject
    mapping(uint => OfferObject) public offerObjects;
    mapping(address => bool) public supportedNfts;
    mapping(address => bool) public supportedCurrencies;

    event CreateOffer(
        uint indexed offerId,
        uint nftsAmount,
        uint price,
        uint fee,
        address currency,
        address indexed seller,
        uint[] nftIds,
        address[] nftAddresses
    );

    event AcceptOffer(
        uint indexed offerId,
        uint nftsAmount,
        uint price,
        uint fee,
        address currency,
        address indexed buyer,
        uint[] nftIds,
        address[] nftAddresses
    );

    event CancelOffer(uint indexed offerId, uint nftsAmount, address indexed seller);
    event NftReceived(address operator, address from, uint nftId, bytes data);

    /// @dev set fee reciever address and fee rate
    /// @param _feeReceiver fee receiving address
    /// @param _feeRate fee amount
    constructor(address payable _feeReceiver, uint256 _feeRate) public {
        require(_feeReceiver != address(0), "invalid fee receiver address");
        require(_feeRate <= 1000, "fee rate maximum value is 1000");

        feeReceiver = _feeReceiver;
        feeRate = _feeRate;

        initReentrancyStatus();
    }

    //--------------------------------------------------
    // onlyOwner methods
    //--------------------------------------------------

    /// @notice enable/disable createOffer() and acceptOffer() functionality
    function enableTrade(bool _tradeEnabled) external onlyOwner { tradeEnabled = _tradeEnabled; }

    /// @notice add supported nft address
    function addSupportedNft(address _nftAddress) external onlyOwner {
        require(_nftAddress != address(0x0), "invalid address");
        require(!supportedNfts[_nftAddress], "currency already enabled");
        supportedNfts[_nftAddress] = true;
    }

    /// @notice disable supported nft address
    function disableSupportedNft(address _nftAddress) external onlyOwner {
        require(supportedNfts[_nftAddress], "currency already removed");
        supportedNfts[_nftAddress] = false;
    }

    /// @notice add supported erc20 token
    function addSupportedCurrency(address _currencyAddress) external onlyOwner {
        require(!supportedCurrencies[_currencyAddress], "currency already supported");
        supportedCurrencies[_currencyAddress] = true;
    }

    /// @notice disable supported currency token
    /// @param _currencyAddress ERC20 contract address
    function disableSupportedCurrency(address _currencyAddress) external onlyOwner {
        require(supportedCurrencies[_currencyAddress], "currency already removed");
        supportedCurrencies[_currencyAddress] = false;
    }

    /// @notice change fee receiver address
    function setFeeReceiver(address payable _feeReceiver) external onlyOwner {
        require(_feeReceiver != address(0x0), "invalid address");
        require(_feeReceiver != feeReceiver, "already set to same address");
        feeReceiver = _feeReceiver;
    }

    /// @notice change fee rate
    /// @param _feeRate Actual rate in percent = _rate / 10
    function setFeeRate(uint _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "fee rate maximum value is 1000");
        require(_feeRate != feeRate, "already using same fee value");
        feeRate = _feeRate;
    }

    //--------------------------------------------------
    // external methods
    //--------------------------------------------------

    /// @notice seller gets back offered nfts from the contract
    function cancelOffer(uint _offerId) external nonReentrant {
        OfferObject storage offer = offerObjects[_offerId];
        require(offer.seller == msg.sender, "sender not creator of offer");

        for(uint i = 0; i < offer.nftsAmount; ++i){
            IERC721(offer.offeredNfts[i].nftAddress)
                .safeTransferFrom(address(this), msg.sender, offer.offeredNfts[i].nftId);
        }

        delete offerObjects[_offerId];

        emit CancelOffer(offer.offerId, offer.nftsAmount, offer.seller);
    }

    /// @notice create an offer by sending up to 20 nfts to contract,
    /// which are available for purchase in exchange for specified price.
    /// @param _price in buy function fee is substracted from _price, so seller gets less.
    function createOffer(
        address _currencyAddress,
        uint _price,
        uint _nftsAmount,
        uint[] calldata _nftIds,
        address[] calldata _nftAddresses

    )
        external
    {
        require(tradeEnabled, "trade is disabled");
        require(supportedCurrencies[_currencyAddress], "unsupported currency address");
        require(_price > 0, "invalid price");
        require(_nftsAmount > 1, "should offer at least 2 nfts");
        require(_nftsAmount <= 20, "cant offer more than 20 nfts");

        for (uint i = 0; i < _nftsAmount; ++i) {
            require(_nftAddresses[i] != address(0), "invalid nft address");
            require(IERC721(_nftAddresses[i]).ownerOf(_nftIds[i]) == msg.sender,
                "sender not owner of nft");
            require(supportedNfts[_nftAddresses[i]], "nft address unsupported");
        }

        lastOfferId++;
        offerObjects[lastOfferId].offerId = lastOfferId;
        offerObjects[lastOfferId].price = _price;
        offerObjects[lastOfferId].nftsAmount = _nftsAmount;
        offerObjects[lastOfferId].fee = feeRate;
        offerObjects[lastOfferId].seller = msg.sender;
        offerObjects[lastOfferId].currency = _currencyAddress;
        for(uint i = 0; i < _nftsAmount; ++i){
            offerObjects[lastOfferId].offeredNfts[i].nftId = _nftIds[i];
            offerObjects[lastOfferId].offeredNfts[i].nftAddress = _nftAddresses[i];
        }

        for (uint i = 0; i < _nftsAmount; ++i) {
            IERC721(_nftAddresses[i])
                .safeTransferFrom(msg.sender, address(this), _nftIds[i]);
        }

        emit CreateOffer(
            lastOfferId,
            _nftsAmount,
            _price,
            feeRate,
            _currencyAddress,
            msg.sender,
            _nftIds,
            _nftAddresses
        );
    }

    /// @notice pay erc20 in exchange for offered nfts.
    /// Fee part of the price is sent to feeReceiver, the rest goes to seller.
    function acceptOffer(uint _offerId) external nonReentrant payable {
        OfferObject storage offer = offerObjects[_offerId];
        require(tradeEnabled, "trade is disabled");
        require(offer.price > 0, "sold/canceled/nonexistent offer");
        require(offer.seller != msg.sender, "cant accept self-made offer");

        uint tipsFee = offer.price.mul(offer.fee).div(1000);
        uint purchase = offer.price.sub(tipsFee);

        if(offer.currency == address(0)){
            require(msg.value >= offer.price, "insufficient ether amount sent");
            if (msg.value.sub(offer.price) > 0){
                uint refund = msg.value.sub(offer.price);
                msg.sender.transfer(refund);
            }
            if (tipsFee > 0)
                feeReceiver.transfer(tipsFee);
            offer.seller.transfer(purchase);
        } else {
            IERC20(offer.currency).safeTransferFrom(msg.sender, feeReceiver, tipsFee);
            IERC20(offer.currency).safeTransferFrom(msg.sender, offer.seller, purchase);
        }

        // @dev nftIds[] and nftAddresses[] are used for emitting values from mapping
        uint[] memory _nftIds = new uint[](offer.nftsAmount);
        address[] memory _nftAddresses = new address[](offer.nftsAmount);
        for(uint i = 0; i < offer.nftsAmount; ++i){
            _nftIds[i] = offer.offeredNfts[i].nftId;
            _nftAddresses[i] = offer.offeredNfts[i].nftAddress;
            IERC721(offer.offeredNfts[i].nftAddress)
                .safeTransferFrom(address(this), msg.sender, offer.offeredNfts[i].nftId);
        }

        delete offerObjects[_offerId];

        emit AcceptOffer(
          offer.offerId,
          offer.nftsAmount,
          offer.price,
          offer.fee,
          offer.currency,
          msg.sender,
          _nftIds,
          _nftAddresses
        );
    }

    //--------------------------------------------------
    // public methods
    //--------------------------------------------------

    /// @dev encrypt token data
    function onERC721Received(
        address operator,
        address from,
        uint tokenId,
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

        emit NftReceived(operator, from, tokenId, data);

        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }
}
