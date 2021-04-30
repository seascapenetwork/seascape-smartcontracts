contract NFTMarketV2 is IERC721Receiver,  ReentrancyGuard {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // --- Data ---
    bool private initialized; // Flag of initialize data

    IERC20 public _dandy = IERC20(0x0);

    struct SalesObject {
        uint256 id;
        uint256 tokenId;
        uint256 startTime;
        uint256 durationTime;
        uint256 maxPrice;
        uint256 minPrice;
        uint256 finalPrice;
        uint8 status;
        address payable seller;
        address payable buyer;
        IERC721 nft;
    }

    uint256 public _salesAmount = 0;

    SalesObject[] _salesObjects;

    uint256 public _minDurationTime = 5 minutes;

    mapping(address => bool) public _seller;
    mapping(address => bool) public _verifySeller;
    mapping(address => bool) public _supportNft;
    bool public _isStartUserSales;

    bool public _isRewardSellerDandy = false;
    bool public _isRewardBuyerDandy = false;

    uint256 public _sellerRewardDandy = 1e15;
    uint256 public _buyerRewardDandy = 1e15;

    uint256 public _tipsFeeRate = 20;
    uint256 public _baseRate = 1000;
    address payable _tipsFeeWallet;

    event eveSales(
        uint256 indexed id,
        uint256 tokenId,
        address buyer,
        uint256 finalPrice,
        uint256 tipsFee
    );

    event eveNewSales(
        uint256 indexed id,
        uint256 tokenId,
        address seller,
        address nft,
        address buyer,
        uint256 startTime,
        uint256 durationTime,
        uint256 maxPrice,
        uint256 minPrice,
        uint256 finalPrice
    );

    event eveCancelSales(
        uint256 indexed id,
        uint256 tokenId
    );

    event eveNFTReceived(address operator, address from, uint256 tokenId, bytes data);

    address public _governance;

    event GovernanceTransferred(address indexed previousOwner, address indexed newOwner);

    mapping(uint256 => address) public _saleOnCurrency;


    mapping(address => bool) public _supportCurrency;


    mapping(address => SupportBuyCurrency) public _supportBuyCurrency;


    mapping(uint256=>uint256) public deflationBaseRates;
    mapping(uint256=>address) public routers;
    // IUniswapV2Router01[] public routers;

    struct SupportBuyCurrency {
        bool status;
        bool isDeflation;
        uint256 deflationRate;
    }




    event eveSupportCurrency(
        address currency,
        bool support
    );

    event eveSupportBuyCurrency(
        address currency,
        bool status,
        bool isDeflation,
        uint256 deflationRate
    );

    event eveDeflationBaseRate(
        uint256 deflationBaseRate
    );

    constructor() public {
        _governance = tx.origin;
    }
    function() external payable {}
    // --- Init ---
    function initialize(
        address payable tipsFeeWallet,
        uint256 minDurationTime,
        uint256 tipsFeeRate,
        uint256 baseRate
    ) public {
        require(!initialized, "initialize: Already initialized!");
        _governance = msg.sender;
        _tipsFeeWallet = tipsFeeWallet;
        _minDurationTime = minDurationTime;
        _tipsFeeRate = tipsFeeRate;
        _baseRate = baseRate;
        initReentrancyStatus();
        initialized = true;
    }


    modifier onlyGovernance {
        require(msg.sender == _governance, "not governance");
        _;
    }

    function setGovernance(address governance)  public  onlyGovernance
    {
        require(governance != address(0), "new governance the zero address");
        emit GovernanceTransferred(_governance, governance);
        _governance = governance;
    }


    /**
     * check address
     */
    modifier validAddress( address addr ) {
        require(addr != address(0x0));
        _;
    }

    modifier checkindex(uint index) {
        require(index <= _salesObjects.length, "overflow");
        _;
    }

    modifier checkSupportBuyCurrendy(address currency) {
        SupportBuyCurrency memory supportBuyCurrency = _supportBuyCurrency[currency];
        require(supportBuyCurrency.status == true, "not support currency");
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

    modifier onlySalesOwner(uint index) {
        require(index <= _salesObjects.length, "overflow");
        SalesObject storage obj = _salesObjects[index];
        require(obj.seller == msg.sender || msg.sender == _governance, "author & governance");
        _;
    }

    function seize(IERC20 asset) external onlyGovernance returns (uint256 balance) {
        balance = asset.balanceOf(address(this));
        asset.safeTransfer(_governance, balance);
    }


    function setIUniswapV2Router01(address router_) public onlyGovernance {
        routers[0] = router_;
    }

    function setSellerRewardDandy(uint256 rewardDandy) public onlyGovernance {
        _sellerRewardDandy = rewardDandy;
    }

    function setBuyerRewardDandy(uint256 rewardDandy) public onlyGovernance {
        _buyerRewardDandy = rewardDandy;
    }

    function addSupportNft(address nft) public onlyGovernance validAddress(nft) {
        _supportNft[nft] = true;
    }

    function removeSupportNft(address nft) public onlyGovernance validAddress(nft) {
        _supportNft[nft] = false;
    }

    function addSeller(address seller) public onlyGovernance validAddress(seller) {
        _seller[seller] = true;
    }

    function removeSeller(address seller) public onlyGovernance validAddress(seller) {
        _seller[seller] = false;
    }

    function addSupportCurrency(address erc20) public onlyGovernance {
        require(_supportCurrency[erc20] == false, "the currency have support");
        _supportCurrency[erc20] = true;
        emit eveSupportCurrency(erc20, true);
    }

    function removeSupportCurrency(address erc20) public onlyGovernance {
        require(_supportCurrency[erc20], "the currency can not remove");
        _supportCurrency[erc20] = false;
        emit eveSupportCurrency(erc20, false);
    }


    function setSupportBuyCurrency(address erc20,bool status,bool isDeflation,uint256 deflationRate ) public onlyGovernance {
        if (isDeflation) {
            require(deflationRate >0, "deflationRate 0");
        }
        _supportBuyCurrency[erc20] = SupportBuyCurrency(status,isDeflation,deflationRate);
        emit eveSupportBuyCurrency(erc20,status,isDeflation,deflationRate);
    }

    function setDeflationBaseRate(uint256 deflationRate_) public onlyGovernance {
        deflationBaseRates[0] = deflationRate_;
        emit eveDeflationBaseRate(deflationRate_);
    }


    function addVerifySeller(address seller) public onlyGovernance validAddress(seller) {
        _verifySeller[seller] = true;
    }

    function removeVerifySeller(address seller) public onlyGovernance validAddress(seller) {
        _verifySeller[seller] = false;
    }

    function setIsStartUserSales(bool isStartUserSales) public onlyGovernance {
        _isStartUserSales = isStartUserSales;
    }

    function setIsRewardSellerDandy(bool isRewardSellerDandy) public onlyGovernance {
        _isRewardSellerDandy = isRewardSellerDandy;
    }

    function setIsRewardBuyerDandy(bool isRewardBuyerDandy) public onlyGovernance {
        _isRewardBuyerDandy = isRewardBuyerDandy;
    }

    function setMinDurationTime(uint256 durationTime) public onlyGovernance {
        _minDurationTime = durationTime;
    }

    function setTipsFeeWallet(address payable wallet) public onlyGovernance {
        _tipsFeeWallet = wallet;
    }

    function setDandyAddress(address addr) external onlyGovernance validAddress(addr) {
        _dandy = IERC20(addr);
    }

    function setBaseRate(uint256 rate) external onlyGovernance {
        _baseRate = rate;
    }

    function setTipsFeeRate(uint256 rate) external onlyGovernance {
        _tipsFeeRate = rate;
    }



    function getSalesEndTime(uint index)
        external
        view
        checkindex(index)
        returns (uint256)
    {
        SalesObject storage obj = _salesObjects[index];
        return obj.startTime.add(obj.durationTime);
    }

    function getSales(uint index) external view checkindex(index) returns(SalesObject memory) {
        return _salesObjects[index];
    }

    function getSalesPrice(uint index)
        external
        view
        checkindex(index)
        returns (uint256)
    {
        SalesObject storage obj = _salesObjects[index];
        if(obj.buyer != address(0x0) || obj.status == 1) {
            return obj.finalPrice;
        } else {
            if(obj.startTime.add(obj.durationTime) < now) {
                return obj.minPrice;
            } else if (obj.startTime >= now) {
                return obj.maxPrice;
            } else {
                uint256 per = obj.maxPrice.sub(obj.minPrice).div(obj.durationTime);
                return obj.maxPrice.sub(now.sub(obj.startTime).mul(per));
            }
        }
    }



    function isVerifySeller(uint index) public view checkindex(index) returns(bool) {
        SalesObject storage obj = _salesObjects[index];
        return _verifySeller[obj.seller];
    }

    function cancelSales(uint index) external checkindex(index) onlySalesOwner(index) mustNotSellingOut(index) nonReentrant {
        require(_isStartUserSales || _seller[msg.sender] == true, "cannot sales");
        SalesObject storage obj = _salesObjects[index];
        obj.status = 2;
        obj.nft.safeTransferFrom(address(this), obj.seller, obj.tokenId);

        emit eveCancelSales(index, obj.tokenId);
    }

    function startSales(uint256 tokenId,
                        uint256 maxPrice,
                        uint256 minPrice,
                        uint256 startTime,
                        uint256 durationTime,
                        address nft,
                        address currency)
        external
        nonReentrant
        validAddress(nft)
        returns(uint)
    {
        require(tokenId != 0, "invalid token");
        require(startTime.add(durationTime) > now, "invalid start time");
        require(durationTime >= _minDurationTime, "invalid duration");
        require(maxPrice >= minPrice, "invalid price");
        require(_isStartUserSales || _seller[msg.sender] == true || _supportNft[nft] == true, "cannot sales");
        require(_supportCurrency[currency] == true, "not support currency");

        IERC721(nft).safeTransferFrom(msg.sender, address(this), tokenId);

        _salesAmount++;
        SalesObject memory obj;

        obj.id = _salesAmount;
        obj.tokenId = tokenId;
        obj.seller = msg.sender;
        obj.nft = IERC721(nft);
        obj.buyer = address(0x0);
        obj.startTime = startTime;
        obj.durationTime = durationTime;
        obj.maxPrice = maxPrice;
        obj.minPrice = minPrice;
        obj.finalPrice = 0;
        obj.status = 0;

        _saleOnCurrency[obj.id] = currency;

        if (_salesObjects.length == 0) {
            SalesObject memory zeroObj;
            zeroObj.tokenId = 0;
            zeroObj.seller = address(0x0);
            zeroObj.nft = IERC721(0x0);
            zeroObj.buyer = address(0x0);
            zeroObj.startTime = 0;
            zeroObj.durationTime = 0;
            zeroObj.maxPrice = 0;
            zeroObj.minPrice = 0;
            zeroObj.finalPrice = 0;
            zeroObj.status = 2;
            _salesObjects.push(zeroObj);
        }

        _salesObjects.push(obj);

        if(_isRewardSellerDandy || _verifySeller[msg.sender]) {
            _dandy.mint(msg.sender, _sellerRewardDandy);
        }

        uint256 tmpMaxPrice = maxPrice;
        uint256 tmpMinPrice = minPrice;
        emit eveNewSales(obj.id, tokenId, msg.sender, nft, address(0x0), startTime, durationTime, tmpMaxPrice, tmpMinPrice, 0);
        return _salesAmount;
    }

    function buy(uint index, address currency_)
        public
        nonReentrant
        mustNotSellingOut(index)
        checkTime(index)
        checkSupportBuyCurrendy(currency_)
        payable
    {
        SalesObject storage obj = _salesObjects[index];
        require(_isStartUserSales || _seller[msg.sender] == true, "cannot sales");
        address currencyAddr = _saleOnCurrency[obj.id];
        uint256 price = this.getSalesPrice(index);
        uint256 tipsFee = price.mul(_tipsFeeRate).div(_baseRate);
        uint256 purchase = price.sub(tipsFee);
        if (address(currencyAddr) == currency_){
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
            }else{
                IERC20(currencyAddr).safeTransferFrom(msg.sender, _tipsFeeWallet, tipsFee);
                IERC20(currencyAddr).safeTransferFrom(msg.sender, obj.seller, purchase);
            }
        }else{
            if (currencyAddr == address(0x0)){
                uint256 ethAmount = tokenToEth(currency_, price);
                // uint256 ethAmount = 0;
                // SupportBuyCurrency memory supportBuyCurrency = _supportBuyCurrency[currency_];
                // if (supportBuyCurrency.isDeflation) {
                //     ethAmount = exactTokenToEth(currency_, price);
                // } else {
                //     ethAmount = tokenToExactEth(currency_, price);
                // }
                require (ethAmount >= price, "umm.....  your price is too low");
                uint256 returnBack = ethAmount.sub(price).add(msg.value);
                if(returnBack > 0) {
                    msg.sender.transfer(returnBack);
                }
                if(tipsFee > 0) {
                    _tipsFeeWallet.transfer(tipsFee);
                }
                obj.seller.transfer(purchase);
            }else{
                // transfer
                require(false, "not support token");
            }
        }

        if(_isRewardBuyerDandy || _verifySeller[obj.seller]) {
            _dandy.mint(msg.sender, _buyerRewardDandy);
        }

        obj.nft.safeTransferFrom(address(this), msg.sender, obj.tokenId);

        obj.buyer = msg.sender;
        obj.finalPrice = price;

        obj.status = 1;

        // fire event
        emit eveSales(index, obj.tokenId, msg.sender, price, tipsFee);
    }



    function onERC721Received(address operator, address from, uint256 tokenId, bytes memory data) public returns (bytes4) {
        //only receive the _nft staff
        if(address(this) != operator) {
            //invalid from nft
            return 0;
        }

        //success
        emit eveNFTReceived(operator, from, tokenId, data);
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }
    // function exactTokenToEth(address erc20Token_, uint256 amountOutMin) internal returns (uint256) {
    //     address erc20Token = erc20Token_;
    //     SupportBuyCurrency memory supportBuyCurrency = _supportBuyCurrency[erc20Token];

    //     address[] memory path = new address[](2);
    //     path[0] = erc20Token;
    //     path[1] = getRouter().WETH();

    //     uint256[] memory amounts = UniswapV2Library.getAmountsIn(getRouter().factory(), amountOutMin, path);
    //     uint256 amountInMax = amounts[0];

    //     uint256 amountIn = amountInMax.mul(getDeflationBaseRate()).div(supportBuyCurrency.deflationRate).mul(getDeflationBaseRate()).div(supportBuyCurrency.deflationRate);

    //     uint256 balanceBefore = IERC20(erc20Token).balanceOf(address(this));
    //     IERC20(erc20Token).safeTransferFrom(msg.sender, address(this), amountIn);
    //     uint256 balanceAfter = IERC20(erc20Token).balanceOf(address(this));
    //     amountIn = balanceAfter.sub(balanceBefore);
    //     IERC20(erc20Token).approve(address(getRouter()), amountIn);

    //     uint256 ethBefore = address(this).balance;

    //     getRouter().swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, 0, path, address(this), block.timestamp);
    //     uint256 ethAfter = address(this).balance;

    //     uint256 balanceLast = IERC20(erc20Token).balanceOf(address(this));
    //     uint256 supAmount = balanceLast.sub(balanceBefore);
    //     if (supAmount>0){
    //         IERC20(erc20Token).safeTransfer(msg.sender, supAmount);
    //     }

    //     return ethAfter.sub(ethBefore);
    // }

    // function tokenToExactEth(address erc20Token, uint256 amountOut) internal returns (uint256) {
    //     address[] memory path = new address[](2);
    //     path[0] = erc20Token;
    //     path[1] = getRouter().WETH();

    //     uint256[] memory amounts = UniswapV2Library.getAmountsIn(getRouter().factory(), amountOut, path);
    //     uint256 amountInMax = amounts[0];

    //     uint256 balanceBefore = IERC20(erc20Token).balanceOf(address(this));
    //     IERC20(erc20Token).safeTransferFrom(msg.sender, address(this), amountInMax);
    //     uint256 balanceAfter = IERC20(erc20Token).balanceOf(address(this));
    //     amountInMax = balanceAfter.sub(balanceBefore);
    //     IERC20(erc20Token).approve(address(getRouter()), amountInMax);

    //     uint256 ethBefore = address(this).balance;
    //     getRouter().swapTokensForExactETH(amountOut, amountInMax, path, address(this), block.timestamp);
    //     uint256 ethAfter = address(this).balance;

    //     uint256 balanceLast = IERC20(erc20Token).balanceOf(address(this));
    //     uint256 supAmount = balanceLast.sub(balanceBefore);
    //     if (supAmount>0){
    //         IERC20(erc20Token).safeTransfer(msg.sender, supAmount);
    //     }
    //     return ethAfter.sub(ethBefore);
    // }
    function tokenToEth(address erc20Token, uint256 amountOut) private returns(uint256) {
        address[] memory path = new address[](2);
        path[0] = erc20Token;
        path[1] = getRouter().WETH();

        uint256[] memory amounts = UniswapV2Library.getAmountsIn(getRouter().factory(), amountOut, path);
        uint256 amountIn = amounts[0];

        SupportBuyCurrency memory supportBuyCurrency = _supportBuyCurrency[erc20Token];
        if (supportBuyCurrency.isDeflation) {
            amountIn = amountIn.mul(getDeflationBaseRate()).div(supportBuyCurrency.deflationRate).mul(getDeflationBaseRate()).div(supportBuyCurrency.deflationRate);
        }

        uint256 balanceBefore = IERC20(erc20Token).balanceOf(address(this));
        IERC20(erc20Token).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 balanceAfter = IERC20(erc20Token).balanceOf(address(this));
        amountIn = balanceAfter.sub(balanceBefore);
        IERC20(erc20Token).approve(address(getRouter()), amountIn);

        uint256 ethBefore = address(this).balance;
        if (supportBuyCurrency.isDeflation) {
            getRouter().swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, 0, path, address(this), block.timestamp);
        } else {
            getRouter().swapTokensForExactETH(amountOut, amountIn, path, address(this), block.timestamp);
        }
        uint256 ethAfter = address(this).balance;

        uint256 balanceLast = IERC20(erc20Token).balanceOf(address(this));
        uint256 supAmount = balanceLast.sub(balanceBefore);
        if (supAmount>0){
            IERC20(erc20Token).safeTransfer(msg.sender, supAmount);
        }
        return ethAfter.sub(ethBefore);
    }

    function getDeflationBaseRate() public view returns(uint256) {
        return deflationBaseRates[0];
    }
    function getRouter() public view returns(IUniswapV2Router01) {
        return IUniswapV2Router01(routers[0]);
    }
}
