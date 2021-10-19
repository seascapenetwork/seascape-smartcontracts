pragma solidity 0.6.7;

/// @dev RiverboatExperimental has experimental functions that modify session data
/// while the session is active.
/// Since this methods directly affect state of the contract, they are considered
/// high risk. They may be included in main contract after extensive testing is complete.

contract RiverboatExperimental {

    event updateSession(
        uint256 indexed sessionId;
        uint256 priceIncrease;
        uint256 intervalDuration;
        uint256 intervalsAmount;
    );

    //--------------------------------------------------------------------
    // Beta functions that modifiy state variables or session data
    //--------------------------------------------------------------------

    /// CAUTION this function is highly experimental and dangerous to use.
    /// Should be avoided until extensive tests are complete.
    /// @notice update current price during the session
    /// @dev the consecutive intervals price will also be different
    /// @param _newPrice new price to be set
    function setCurrentPrice(uint256 _newPrice) external onlyOwner returns (currentPrice){
        require(_newPrice > 0, "price should be higher than 0");

        currentPrice = _newPrice;
        return currentPrice;
    }

    /// CAUTION this function is highly experimental and dangerous to use.
    /// Should be avoided until extensive tests are complete.
    /// @dev Update existing/running session data
    function updateSessionData(
        uint256 priceIncrease,
        uint256 intervalDuration,
        uint256 intervalsAmount
    )
        external
        onlyOwner
    {

        // TODO require statements
        // session can either be starting in the future or currently running
        // cant be finished

        // priceIncrease will apply during next interval
        // intervalDuration can either apply immediately or in next interval
        // intervalsAmount will be applied immediately

        // update session data

        // emit event
    }
}
