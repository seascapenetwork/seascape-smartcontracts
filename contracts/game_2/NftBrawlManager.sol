pragma solidity 0.6.7;

import "./NftRush.sol";
import "./NftBrawlInterface.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/// @title Nft Rush a game on seascape platform allowing to earn Nft by spending crowns
/// @notice Game comes with Leaderboard located on it's on Solidity file.
/// @author Medet Ahmetson
contract NftBrawlManager is Ownable, NftBrawlInterface {
    /// @notice nft factory is a contract that mints nfts
    NftRush nftBrawl;

    address payable public immutable gelato;
    // Revoke/Allow gelato bot to announce leaderboard.
    bool public gelatoUsage = true;
    // If address is 0, then gelato bot will be paid with ETH, otherwise with the ERC20 token.
    address public payment;

    modifier onlyOwnerOrGelato(uint256 _amount) {
        if (gelatoUsage) {
            require(msg.sender == gelato, "Gelatofied: Only gelato");
            _;
            if (payment == address(0)) {
                (bool success, ) = gelato.call{value: _amount}("");
                require(success, "Gelatofied: Gelato fee failed");
            } else {
                SafeERC20.safeTransfer(IERC20(payment), gelato, _amount);
            }
        } else {
            require(msg.sender == owner(), "Only owner");
            _;
        }
    }

    event Received(address, uint);

    constructor(address _nftBrawl, address payable _gelato) public {
        gelato = _gelato;
        nftBrawl = NftRush(payable(_nftBrawl));
        payment = address(0);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------

    function setGelatoUsage(bool _usage) external onlyOwner {
        gelatoUsage = _usage;
    }

    function setPayment(address _payment) external onlyOwner {
        payment = _payment;
    }

    function payout () public onlyOwner returns(bool res) {
        msg.sender.transfer(address(this).balance);
        return true;
    }

    function setNftBrawlOwner(address newOwner) external onlyOwner {
        nftBrawl.transferOwnership(newOwner);
    }

    function startSession(address _rewardToken, uint256 _interval, uint256 _period, uint256 _startTime, uint256 _generation) external override onlyOwner {
        nftBrawl.startSession(_rewardToken, _interval, _period, _startTime, _generation);
    }

    function setNftFactory(address _address) external override onlyOwner {
        nftBrawl.setNftFactory(_address);
    }

    function setMinSpendAmount(uint256 _amount) external override onlyOwner {
        nftBrawl.setMinSpendAmount(_amount);
    }
        
    function setMaxSpendAmount(uint256 _amount) external override onlyOwner {
        nftBrawl.setMaxSpendAmount(_amount);
    }

    function setPrizes(uint256[10] calldata _spentDaily, uint256[10] calldata _mintedAllTime) external override onlyOwner {
        nftBrawl.setPrizes(_spentDaily, _mintedAllTime);
    }

    //--------------------------------------------------
    // Only owner or gelato can announce the leaderboard winners
    //--------------------------------------------------

    function announceDailySpentWinners(uint256 _sessionId, address[10] calldata _winners, uint8 _winnersAmount, uint256 _fee) external override onlyOwnerOrGelato(_fee) {
        nftBrawl.announceDailySpentWinners(_sessionId, _winners, _winnersAmount);
    }

    function announceAllTimeMintedWinners(uint256 _sessionId, address[10] calldata _winners, uint8 _winnersAmount, uint256 _fee) external override onlyOwnerOrGelato(_fee) {
        nftBrawl.announceAllTimeMintedWinners(_sessionId, _winners, _winnersAmount);
    }
}
