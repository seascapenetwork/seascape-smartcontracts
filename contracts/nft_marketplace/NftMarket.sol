pragma solidity ^0.6.7;

pragma experimental ABIEncoderV2;


import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../seascape_nft/SeascapeNft.sol";
import "./ReentrancyGuard.sol";



contract NftMarket is IERC721Receiver,  ReentrancyGuard, Ownable {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;


    struct SalesObject {
        uint256 id;               // sales ID
        uint256 tokenId;          // token unique id
        address nft;              // nft address
        address currency;         // currency address
        address payable seller;   // seller address
        address payable buyer;    // buyer address
        uint256 startTime;        // timestamp when the sale starts
        uint256 price;
        uint8 status;             // 2 = sale canceled, 1 = sold, 0 = for sale
    }


    uint256 public salesAmount;   // keeps count of sales

    mapping(address => mapping(uint256 => SalesObject)) salesObjects; // store sales in a mapping

    mapping(address => bool) public supportNft;        // supported ERC721 contracts
    mapping(address => bool) public supportCurrency;   // supported ERC20 contracts


    bool public salesEnabled;  // enable/disable trading

    uint256 public tipsFeeRate; // feeAmount = (tipsFeeRate / 1000) * price
    address payable tipsFeeWallet; // reciever of fees

    event Buy(
        uint256 indexed id,
        uint256 tokenId,
        address buyer,
        uint256 price,
        uint256 tipsFee,
        address currency
    );

    event Sell(
        uint256 indexed id,
        uint256 tokenId,
        address nft,
        address currency,
        address seller,
        address buyer,
        uint256 startTime,
        uint256 price
    );

    event SaleCanceled(
        uint256 indexed id,
        uint256 tokenId
    );

    event NftReceived(address operator, address from, uint256 tokenId, bytes data);


    constructor(address payable _tipsFeeWallet, uint256 _tipsFeeRate) public {
      tipsFeeWallet = _tipsFeeWallet;
      tipsFeeRate = _tipsFeeRate;
      initReentrancyStatus();
    }

    // recieve tokens
    receive() external payable { }
    //@note Prefer using a receive function only, whenever possible
    //fallback() external [payable] { }

  function addSupportNft(address _nftAddress) public onlyOwner {
      require(_nftAddress != address(0x0), "invalid address");
      supportNft[_nftAddress] = true;
  }

  function removeSupportNft(address _nftAddress) public onlyOwner {
      require(_nftAddress != address(0x0), "invalid address");
      supportNft[_nftAddress] = false;
  }

  function addSupportCurrency(address _currencyAddress) public onlyOwner {
      require(_currencyAddress != address(0x0), "invalid address");
      require(supportCurrency[_currencyAddress] == false, "currency already supported");
      supportCurrency[_currencyAddress] = true;
  }

  function removeSupportCurrency(address _currencyAddress) public onlyOwner {
      require(_currencyAddress != address(0x0), "invalid address");
      require(supportCurrency[_currencyAddress], "currency already removed");
      supportCurrency[_currencyAddress] = false;
  }

  // enable/disable trading
  function enableSales(bool _salesEnabled) external onlyOwner {
      salesEnabled = _salesEnabled;
  }

  // set address to recieve fees
  function setTipsFeeWallet(address payable _walletAddress) public onlyOwner {
      tipsFeeWallet = _walletAddress;
  }

  // adjust tips rate in percents
  function setTipsFeeRate(uint256 _rate) external onlyOwner {
      tipsFeeRate = _rate;
  }

  // returns total amount of sales
  function getSalesAmount() external view returns(uint) {
    return salesAmount;
  }

  // returns sale object
  function getSales(uint _tokenId, address _nftAddress) public view returns(SalesObject memory) {
      return salesObjects[_nftAddress][_tokenId];
  }

  // returns the price of sale
  function getSalesPrice(uint _tokenId, address _nftAddress) external view returns (uint256) {
      SalesObject storage obj = salesObjects[_nftAddress][_tokenId];
      return obj.price;
  }

  // cancel a sale - only nft owner can call
  function cancelSell(uint _tokenId, address _nftAddress) public nonReentrant {
      SalesObject storage obj = salesObjects[_nftAddress][_tokenId];
      require(obj.status == 0, "sorry, selling out");
      require(obj.seller == msg.sender || msg.sender == owner(), "author & owner");
      require(salesEnabled, "sales are closed");
      obj.status = 2;
      IERC721 nft = IERC721(obj.nft);
      nft.safeTransferFrom(address(this), obj.seller, obj.tokenId);

      emit SaleCanceled(_tokenId, obj.tokenId);
  }

  // put nft for sale
  function sell(uint256 _tokenId,
                      uint256 _price,
                      address _nftAddress,
                      address _currency
                      )
      public
      nonReentrant
      returns(uint)
  {
      require(_nftAddress != address(0x0), "invalid nft address");
      require(_tokenId != 0, "invalid nft token");
      require(salesEnabled, "sales are closed");
      require(supportNft[_nftAddress] == true, "nft address unsupported");
      require(supportCurrency[_currency] == true, "currency not supported");

      IERC721(_nftAddress).safeTransferFrom(msg.sender, address(this), _tokenId);

      salesAmount++;
      SalesObject memory obj;

      obj.id = salesAmount;
      obj.tokenId = _tokenId;
      obj.nft = _nftAddress;
      obj.currency = _currency;
      obj.seller = msg.sender;
      obj.buyer = address(0x0);
      obj.startTime = now;
      obj.price = _price;
      obj.status = 0;

      salesObjects[_nftAddress][_tokenId] = SalesObject(salesAmount, _tokenId,
        _nftAddress, _currency, msg.sender, address(0x0), now, _price, 0);

      emit Sell(salesAmount, _tokenId, _nftAddress, _currency, msg.sender,
        address(0x0), now, _price);
      return salesAmount;
  }

  // log nft reciept upon transfer
  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes memory data
    )
    public override returns (bytes4) {
     //only receive the _nft staff
     if(address(this) != operator) {
         //invalid from nft
         return 0;
     }

     //success
     emit NftReceived(operator, from, tokenId, data);
     return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
  }

  // buy nft
  function buy(uint _tokenId, address _nftAddress, address _currency) public nonReentrant payable {
    SalesObject storage obj = salesObjects[_nftAddress][_tokenId];
    require(obj.status == 0, "sorry, selling out");
    require(obj.startTime <= now, "not yet for sale");
    require(salesEnabled, "sales are closed");
    require(msg.sender != obj.seller, "cant buy from yourself");

    require(obj.currency == _currency, "must pay same currency as sold");
    uint256 price = this.getSalesPrice(_tokenId, _nftAddress);
    uint256 tipsFee = price.mul(tipsFeeRate).div(1000);
    uint256 purchase = price.sub(tipsFee);

    if (obj.currency == address(0x0)){
        require (msg.value >= price, "your price is too low");
        uint256 returnBack = msg.value.sub(price);
        if(returnBack > 0) {
            msg.sender.transfer(returnBack);
        }
        if(tipsFee > 0) {
            tipsFeeWallet.transfer(tipsFee);
        }
        obj.seller.transfer(purchase);
    }
    else{
        IERC20(obj.currency).safeTransferFrom(msg.sender, tipsFeeWallet, tipsFee);
        IERC20(obj.currency).safeTransferFrom(msg.sender, obj.seller, purchase);
    }

      IERC721 nft = IERC721(obj.nft);
      nft.safeTransferFrom(address(this), msg.sender, obj.tokenId);
      obj.buyer = msg.sender;

      obj.status = 1;
      emit Buy(obj.id, obj.tokenId, msg.sender, price, tipsFee, obj.currency);
  }

}
