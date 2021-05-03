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
        uint256 id;               // object id
        uint256 tokenId;
        uint256 startTime;        // timestamp when the sale starts
        uint256 price;
        uint8 status;             // 2 = sale canceled, 1 = sold, 0 = for sale
        address payable seller;   // seller address
        address payable buyer;    // buyer address
        address nft;
        address currency;
    }


    uint256 public _salesAmount;   // keeps count of sales

    SalesObject[] _salesObjects;  // store sales in an array

    mapping(uint256 => uint256) public nftIdToIndex;

    mapping(address => bool) public _supportNft;
    mapping(address => bool) public _supportCurrency;


    bool public _isStartUserSales;  // enable/disable trading

    uint256 public _tipsFeeRate; // feeAmount = (_tipsFeeRate / 1000) * price
    address payable _tipsFeeWallet; // reciever of fees

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


    constructor(address payable tipsFeeWallet, uint256 tipsFeeRate) public {
      _tipsFeeWallet = tipsFeeWallet;
      _tipsFeeRate = tipsFeeRate;
      initReentrancyStatus();
    }

    // recieve tokens
    receive() external payable { }
    //@note Prefer using a receive function only, whenever possible
    //fallback() external [payable] { }

  // index cant be higher than sales amsellingount
  modifier checkIndex(uint index) {
      require(index <= _salesObjects.length, "overflow");
      _;
  }


  function addSupportNft(address nft) public onlyOwner {
      require(nft != address(0x0), "invalid address");
      _supportNft[nft] = true;
  }

  function removeSupportNft(address nft) public onlyOwner {
      require(nft != address(0x0), "invalid address");
      _supportNft[nft] = false;
  }

  function addSupportCurrency(address currency) public onlyOwner {
      require(currency != address(0x0), "invalid address");
      require(_supportCurrency[currency] == false, "currency already supported");
      _supportCurrency[currency] = true;
  }

  function removeSupportCurrency(address currency) public onlyOwner {
      require(currency != address(0x0), "invalid address");
      require(_supportCurrency[currency], "currency already removed");
      _supportCurrency[currency] = false;
  }

  // enable/disable trading
  function setIsStartUserSales(bool isStartUserSales) external onlyOwner {
      _isStartUserSales = isStartUserSales;
  }

  // set address to recieve fees
  function setTipsFeeWallet(address payable wallet) public onlyOwner {
      _tipsFeeWallet = wallet;
  }

  // adjust tips rate in percents
  function setTipsFeeRate(uint256 rate) external onlyOwner {
      _tipsFeeRate = rate;
  }

  function getSalesAmount() external view returns(uint) {
    return _salesAmount;
  }

  function getSalesByNftId(uint tokenId) public {
    uint index = nftIdToIndex[tokenId];
    getSales(index);
  }

  // returns sales by index
  function getSales(uint index) public view checkIndex(index) returns(SalesObject memory) {
      return _salesObjects[index];
  }


  // returns just the price of sale by index - may be deleted
  function getSalesPrice(uint index)
      external
      view
      checkIndex(index)
      returns (uint256)
  {
      SalesObject storage obj = _salesObjects[index];
      return obj.price;
  }

  function cancelSalesByNftId(uint tokenId) public {
    uint index = nftIdToIndex[tokenId];
    cancelSales(index);
  }

  // cancel a sale - only nft owner can call
  function cancelSales(uint index)
    public
    checkIndex(index)
    nonReentrant
    {
      SalesObject storage obj = _salesObjects[index];
      require(obj.status == 0, "sorry, selling out");
      require(obj.seller == msg.sender || msg.sender == owner(), "author & owner");
      require(_isStartUserSales, "sales are closed");
      obj.status = 2;
      IERC721 nft = IERC721(obj.nft);
      nft.safeTransferFrom(address(this), obj.seller, obj.tokenId);

      emit SaleCanceled(index, obj.tokenId);
  }

  function startSalesByNftId(uint256 tokenId, uint256 price,
    address nft, address currency) public {
    uint index = nftIdToIndex[tokenId];
    startSales(index, price, nft, currency);
  }

  // put nft for sale
  function startSales(uint256 tokenId,
                      uint256 price,
                      address _nft,
                      address _currency
                      )
      public
      nonReentrant
      returns(uint)
  {
      require(_nft != address(0x0), "invalid nft address");
      require(tokenId != 0, "invalid nft token");
      require(_isStartUserSales, "sales are closed");
      require(_supportNft[_nft] == true, "nft address unsupported");
      require(_supportCurrency[_currency] == true, "currency not supported");

      IERC721(_nft).safeTransferFrom(msg.sender, address(this), tokenId);

      _salesAmount++;
      SalesObject memory obj;

      obj.id = _salesAmount;
      obj.tokenId = tokenId;
      obj.nft = _nft;
      obj.currency = _currency;
      obj.seller = msg.sender;
      obj.buyer = address(0x0);
      obj.startTime = now;
      obj.price = price;
      obj.status = 0;

      _salesObjects.push(obj);

      nftIdToIndex[tokenId] = _salesAmount - 1;

      emit Sell(obj.id, tokenId, obj.currency, _nft, msg.sender, address(0x0), now, price);
      return _salesAmount;
  }

  // upon transfer, log nft reciept
  function onERC721Received(address operator, address from, uint256 tokenId, bytes memory data) public override returns (bytes4) {
     //only receive the _nft staff
     if(address(this) != operator) {
         //invalid from nft
         return 0;
     }

     //success
     emit NftReceived(operator, from, tokenId, data);
     return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
  }


  function buyByNftId(uint tokenId, address currency) public {
    uint index = nftIdToIndex[tokenId];
    buy(index, currency);
  }

  // buy nft
  function buy(uint index, address _currency)
      public
      nonReentrant
      checkIndex(index)
      payable
  {
    SalesObject storage obj = _salesObjects[index];
    require(obj.status == 0, "sorry, selling out");
    require(obj.startTime <= now, "not yet for sale");
    require(_isStartUserSales, "sales are closed");
    require(msg.sender != obj.seller, "cant buy from yourself");

    require(obj.currency == _currency, "must pay same currency as sold");
    uint256 price = this.getSalesPrice(index);
    uint256 tipsFee = price.mul(_tipsFeeRate).div(1000);
    uint256 purchase = price.sub(tipsFee);

    if (obj.currency == address(0x0)){
        require (msg.value >= this.getSalesPrice(index), "your price is too low");
        uint256 returnBack = msg.value.sub(price);
        if(returnBack > 0) {
            msg.sender.transfer(returnBack);
        }
        if(tipsFee > 0) {
            _tipsFeeWallet.transfer(tipsFee);
        }
        obj.seller.transfer(purchase);
    }
    else{
        IERC20(obj.currency).safeTransferFrom(msg.sender, _tipsFeeWallet, tipsFee);
        IERC20(obj.currency).safeTransferFrom(msg.sender, obj.seller, purchase);
    }

      IERC721 nft = IERC721(obj.nft);
      nft.safeTransferFrom(address(this), msg.sender, obj.tokenId);
      obj.buyer = msg.sender;


      obj.status = 1;
      emit Buy(index, obj.tokenId, msg.sender, price, tipsFee, obj.currency);
  }

}
