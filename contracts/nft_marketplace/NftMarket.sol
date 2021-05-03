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
        address nft;              // nft address
        address currency;         // currency address
        address payable seller;   // seller address
        address payable buyer;    // buyer address
        uint256 startTime;        // timestamp when the sale starts
        uint256 price;
        uint8 status;             // 2 = sale canceled, 1 = sold, 0 = for sale
    }


    uint256 public _salesAmount;   // keeps count of sales

    mapping(address => mapping(uint256 => SalesObject)) salesObjects; // store sales in a mapping

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

  // returns sales by index
  function getSales(uint _tokenId, address _nftAddress) public view returns(SalesObject memory) {
      return salesObjects[_nftAddress][_tokenId];
  }


  // returns just the price of sale by index - may be deleted
  function getSalesPrice(uint _tokenId, address _nftAddress) external view returns (uint256) {
      SalesObject storage obj = salesObjects[_nftAddress][_tokenId];
      return obj.price;
  }


  // cancel a sale - only nft owner can call
  function cancelSales(uint _tokenId, address _nftAddress) public nonReentrant {
      SalesObject storage obj = salesObjects[_nftAddress][_tokenId];
      require(obj.status == 0, "sorry, selling out");
      require(obj.seller == msg.sender || msg.sender == owner(), "author & owner");
      require(_isStartUserSales, "sales are closed");
      obj.status = 2;
      IERC721 nft = IERC721(obj.nft);
      nft.safeTransferFrom(address(this), obj.seller, obj.tokenId);

      emit SaleCanceled(_tokenId, obj.tokenId);
  }

  // put nft for sale
  function startSales(uint256 _tokenId,
                      uint256 price,
                      address _nftAddress,
                      address _currency
                      )
      public
      nonReentrant
      returns(uint)
  {
      require(_nftAddress != address(0x0), "invalid nft address");
      require(_tokenId != 0, "invalid nft token");
      require(_isStartUserSales, "sales are closed");
      require(_supportNft[_nftAddress] == true, "nft address unsupported");
      require(_supportCurrency[_currency] == true, "currency not supported");

      IERC721(_nftAddress).safeTransferFrom(msg.sender, address(this), _tokenId);

      _salesAmount++;
      SalesObject memory obj;

      obj.id = _salesAmount;
      obj.tokenId = _tokenId;
      obj.nft = _nftAddress;
      obj.currency = _currency;
      obj.seller = msg.sender;
      obj.buyer = address(0x0);
      obj.startTime = now;
      obj.price = price;
      obj.status = 0;

      salesObjects[_nftAddress][_tokenId] = SalesObject(_salesAmount, _tokenId,
        _nftAddress, _currency, msg.sender, address(0x0), now, price, 0);

      emit Sell(_salesAmount, _tokenId, _nftAddress, _currency, msg.sender, address(0x0), now, price);
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

  // buy nft
  function buy(uint _tokenId, address _nftAddress, address _currency) public nonReentrant payable {
    SalesObject storage obj = salesObjects[_nftAddress][_tokenId];
    require(obj.status == 0, "sorry, selling out");
    require(obj.startTime <= now, "not yet for sale");
    require(_isStartUserSales, "sales are closed");
    require(msg.sender != obj.seller, "cant buy from yourself");

    require(obj.currency == _currency, "must pay same currency as sold");
    uint256 price = this.getSalesPrice(_tokenId, _nftAddress);
    uint256 tipsFee = price.mul(_tipsFeeRate).div(1000);
    uint256 purchase = price.sub(tipsFee);

    if (obj.currency == address(0x0)){
        require (msg.value >= price, "your price is too low");
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
      emit Buy(obj.id, obj.tokenId, msg.sender, price, tipsFee, obj.currency);
  }

}
