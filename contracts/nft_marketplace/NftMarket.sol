pragma solidity ^0.6.7;

pragma experimental ABIEncoderV2;


import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../seascape_nft/SeascapeNft.sol";
import "./ReentrancyGuard.sol";



contract NftMarket is IERC721Receiver,  ReentrancyGuard, Ownable {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // seascape token
    IERC20 public crowns;
    SeascapeNft private nft;

    // --- Data ---
    bool private initialized; // Flag of data initialized


    struct SalesObject {
        uint256 id;
        uint256 tokenId;
        uint256 startTime;        // timestamp when the sale starts
        uint256 maxPrice;         // remove, the same as finalPrice
        uint256 finalPrice;       // nf price
        uint8 status;             // 2 = sale canceled, 1 = sold, 0 = for sale
        address payable seller;   // seller address
        address payable buyer;    // buyer address
    }


    uint256 public _salesAmount;   // keeps count of sales

    SalesObject[] _salesObjects;  // store sales in an array

    mapping(address => bool) public _supportNft;
    bool public _isStartUserSales;  // enable/disable trading

    uint256 public _tipsFeeRate = 20; // feeAmount = (_tipsFeeRate / _baseRate) * price
    uint256 public _baseRate = 1000;
    address payable _tipsFeeWallet; // reciever of fees

    event Buy(
        uint256 indexed id,
        uint256 tokenId,
        address buyer,
        uint256 finalPrice,
        uint256 tipsFee
    );

    event Sell(
        uint256 indexed id,
        uint256 tokenId,
        address seller,
        address buyer,
        uint256 startTime,
        uint256 maxPrice,
        uint256 finalPrice
    );

    event eveCancelSales(
        uint256 indexed id,
        uint256 tokenId
    );

    event eveNFTReceived(address operator, address from, uint256 tokenId, bytes data);

    mapping(uint256 => address) public _saleOnCurrency;

    mapping(uint256=>address) public routers;


    constructor(address _crowns, address _nft) public {
      crowns = IERC20(_crowns);
      nft = SeascapeNft(_nft);
    }

    // recieve tokens
    receive() external payable { }
    //@note Prefer using a receive function only, whenever possible
    //fallback() external [payable] { }

    // set tips data - may be moved to constructor
    function initialize(
        address payable tipsFeeWallet,
        uint256 tipsFeeRate,
        uint256 baseRate
    ) public {
        require(!initialized, "initialize: Already initialized!");
        _tipsFeeWallet = tipsFeeWallet;
        _tipsFeeRate = tipsFeeRate;
        _baseRate = baseRate;
        initReentrancyStatus();
        initialized = true;
    }


    /**
     * check address
     */
    modifier validAddress( address addr ) {
        require(addr != address(0x0));
        _;
    }

    // index cant be higher than sales amount
    modifier checkindex(uint index) {
        require(index <= _salesObjects.length, "overflow");
        _;
    }


    modifier checkTime(uint index) {
        require(index <= _salesObjects.length, "overflow");
        SalesObject storage obj = _salesObjects[index];
        require(obj.startTime <= now, "!open");
        _;
    }


    modifier mustNotSellingOut(uint index) {
        require(index <= _salesObjects.length, "overflow");
        SalesObject storage obj = _salesObjects[index];
        require(obj.buyer == address(0x0) && obj.status == 0, "sry, selling out");
        _;
    }

    //only used in cancelSales
    modifier onlySalesOwner(uint index) {
        require(index <= _salesObjects.length, "overflow");
        SalesObject storage obj = _salesObjects[index];
        require(obj.seller == msg.sender || msg.sender == owner(), "author & owner");
        _;
    }

  // enable/disable trading
  function setIsStartUserSales(bool isStartUserSales) public onlyOwner {
      _isStartUserSales = isStartUserSales;
  }

  // set address to recieve fees
  function setTipsFeeWallet(address payable wallet) public onlyOwner {
      _tipsFeeWallet = wallet;
  }

  // adjust base rate - can be deleted
  function setBaseRate(uint256 rate) external onlyOwner {
      _baseRate = rate;
  }

  // adjust tips rate in percents
  function setTipsFeeRate(uint256 rate) external onlyOwner {
      _tipsFeeRate = rate;
  }

  // returns sales by index
  function getSales(uint index) external view checkindex(index) returns(SalesObject memory) {
      return _salesObjects[index];
  }

  // returns just the price of sale by index - may be deleted
  function getSalesPrice(uint index)
      external
      view
      checkindex(index)
      returns (uint256)
  {
      SalesObject storage obj = _salesObjects[index];
      return obj.maxPrice;
  }

  // cancel a sale - only nft owner can call
  function cancelSales(uint index) external checkindex(index) onlySalesOwner(index) mustNotSellingOut(index) nonReentrant {
      require(_isStartUserSales, "cannot sales");
      SalesObject storage obj = _salesObjects[index];
      obj.status = 2;
      nft.safeTransferFrom(address(this), obj.seller, obj.tokenId);

      emit SaleCanceled(index, obj.tokenId);
  }

  // put nft for sale
  function startSales(uint256 tokenId,
                      uint256 maxPrice,
                      uint256 startTime,
                      address currency)
      external
      nonReentrant
      returns(uint)
  {
      require(tokenId != 0, "invalid token");
      require(startTime > now, "sale must start in the future");
      require(_isStartUserSales, "cannot sales");

      nft.safeTransferFrom(msg.sender, address(this), tokenId);

      _salesAmount++;
      SalesObject memory obj;

      obj.id = _salesAmount;
      obj.tokenId = tokenId;
      obj.seller = msg.sender;
      obj.buyer = address(0x0);
      obj.startTime = startTime;
      obj.maxPrice = maxPrice;
      obj.finalPrice = 0;
      obj.status = 0;

      _saleOnCurrency[obj.id] = currency;

      if (_salesObjects.length == 0) {
          SalesObject memory zeroObj;
          zeroObj.tokenId = 0;
          zeroObj.seller = address(0x0);
          zeroObj.buyer = address(0x0);
          zeroObj.startTime = 0;
          zeroObj.maxPrice = 0;
          zeroObj.finalPrice = 0;
          zeroObj.status = 2;
          _salesObjects.push(zeroObj);
      }

      _salesObjects.push(obj);

      uint256 tmpMaxPrice = maxPrice;
      emit Sell(obj.id, tokenId, msg.sender, address(0x0), startTime, tmpMaxPrice, 0);
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
     emit eveNFTReceived(operator, from, tokenId, data);
     return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
  }

  // buy nft
  function buy(uint index, address currency_)
      public
      nonReentrant
      mustNotSellingOut(index)
      checkTime(index)
      payable
  {
    SalesObject storage obj = _salesObjects[index];
    require(_isStartUserSales, "cannot sales");

    address currencyAddr = _saleOnCurrency[obj.id];
    uint256 price = this.getSalesPrice(index);
    uint256 tipsFee = price.mul(_tipsFeeRate).div(_baseRate);
    uint256 purchase = price.sub(tipsFee);

    require(address(currencyAddr) == currency_, "must use same currency as seller");
    if (currencyAddr == address(0x0)){
        require (msg.value >= this.getSalesPrice(index), "umm.....  your price is too low");
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
        IERC20(currencyAddr).safeTransferFrom(msg.sender, _tipsFeeWallet, tipsFee);
        IERC20(currencyAddr).safeTransferFrom(msg.sender, obj.seller, purchase);
    }

      nft.safeTransferFrom(address(this), msg.sender, obj.tokenId);

      obj.buyer = msg.sender;
      obj.finalPrice = price;

      obj.status = 1;

      // fire event
      emit Buy(index, obj.tokenId, msg.sender, price, tipsFee);
  }

}
