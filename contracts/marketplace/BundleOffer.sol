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

    uint256 public lastSaleId;
    bool public tradeEnabled = true;
    uint256 public feeRate;   // 5 = 0.5%; 100 = 10%
    address payable private feeReceiver;

    struct SalesObject {
        uint256 saleId;
        address payable seller;
        address currency;
        uint256 price;
        mapping(uint256 => OfferedToken) offeredTokens;
    }

    struct OfferedToken{
        uint256 tokenId;
        address tokenAddress;
    }

    /// @param saleId => SalesObject
    mapping(uint256 => SalesObject)) saleObjects;
    mapping(address => bool) public supportedNft;
    mapping(address => bool) public supportedCurrency;


    event Buy(
        uint256 indexed saleId,
        uint256[] nftIds,
        address[] nftAddresses,
        address buyer,
        address seller,
        uint256 price,
        uint256 fee,
        address currency
    );

    event Sell(
        uint256 indexed saleId,
        uint256[] nftIds,
        address[] nftAddresses,
        address currency,
        address seller,
        uint256 price
    );

    event CancelSell(uint256 indexed saleId, uint256[] nftIds, address[] nftAddresses);
    event NftReceived(address operator, address from, uint256 tokenId, bytes data);

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
        supportedNft[_nftAddress] = true;
    }

    /// @notice disable supported nft address
    function removeSupportedNft(address _nftAddress) external onlyOwner {
        require(_nftAddress != address(0x0), "invalid address");
        supportedNft[_nftAddress] = false;
    }

    /// @notice add supported erc20 token
    function addSupportedCurrency(address _currencyAddress) external onlyOwner {
        require(!supportedCurrency[_currencyAddress], "currency already supported");
        supportedCurrency[_currencyAddress] = true;
    }

    /// @notice disable supported currency token
    /// @param _currencyAddress ERC20 contract address
    function removeSupportedCurrency(address _currencyAddress) external onlyOwner {
        require(supportedCurrency[_currencyAddress], "currency already removed");
        supportedCurrency[_currencyAddress] = false;
    }

    /// @notice change fee receiver address
    function setFeeReceiver(address payable _feeReceiver) external onlyOwner {
        require(_feeReceiver != address(0x0), "invalid address");
        feeReceiver = _feeReceiver;
    }

    /// @notice change fee rate
    /// @param _rate amount value. Actual rate in percent = _rate / 10
    function setFeeRate(uint256 _rate) external onlyOwner {
        require(_feeRate <= 1000, "fee rate maximum value is 1000");
        feeRate = _rate;
    }

    //--------------------------------------------------
    // external methods
    //--------------------------------------------------

    /// @notice cancel nft sale
    function cancelSale(uint _saleId) external nonReentrant {
        SalesObject storage saleObject = saleObjects[_saleId];
        require(saleObject.seller == msg.sender, "seller not nft owner");

        delete saleObjects[_offerId];

        // TODO transfer back all the nfts
        IERC721 nft = IERC721(obj.nft);
        nft.safeTransferFrom(address(this), obj.seller, obj.tokenId);

        // TODO update state
        emit CancelSell(obj.id, obj.tokenId);
    }

    function sell() external { }

    /// @notice pay erc20 in exchange for offered tokens
    function buy(uint _saleId) external nonReentrant payable {
        SalesObject storage offer = salesObjects[_saleId];
        require(tradeEnabled, "trade is disabled");
        require(offer.price > "sold/canceled/nonexistent sale");

        uint tipsFee = offer.price.mul(feeRate).div(1000);
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
            IERC20(offer.currency).safeTransferFrom(msg.sender, obj.seller, purchase);
        }

        for(uint i = 0; i < offer.nftsAmount; ++i){
            IERC721(offer.offeredTokens[i].tokenAddress)
                .safeTransferFrom(address(this), msg.sender, obj.offeredTokens[i].tokenId);
        }

        delete salesObjects[_saleId];

        emit Buy(
          offer.saleId,
          offer.nftsAmount,
          offer.price,
          feeRate,
          offer.currency,
          msg.sender,
          offer.seller
        );
    }
}
