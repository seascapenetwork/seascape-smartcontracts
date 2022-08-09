// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SwapSigner holds address for signature verification.
/// It is used by NftSwap and SwapParams contracts.
/// @author Nejc Schneider
contract SwapSigner is Ownable {

    address public signer;         // @dev verify v, r, s signature

    constructor() { signer = msg.sender; }

    /// @notice change address to verify signature against
    /// @param _signer new signer address
    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "invalid signer address");
        signer = _signer;
    }

    /// @notice returns verifier of signatures
    /// @return signer address
    function getSigner() external view returns(address) { return signer; }
}
