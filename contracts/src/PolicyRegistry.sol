// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DoleAI PolicyRegistry
/// @notice Compliance layer for an DoleAI pool: whitelisted participants,
///         per-holder caps and a global pause. Controlled by the pool owner.
///         Consulted by AssetToken on every transfer. No hardcoded values.
contract PolicyRegistry {
    address public owner;

    mapping(address => bool) public whitelisted;
    mapping(address => uint256) public holderCap; // 0 = unlimited
    bool public transfersPaused;

    event OwnerChanged(address indexed previous, address indexed current);
    event WhitelistUpdated(address indexed account, bool status);
    event HolderCapUpdated(address indexed account, uint256 cap);
    event TransfersPaused(bool paused);

    error OnlyOwner();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setWhitelisted(address account, bool status) external onlyOwner {
        whitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }

    /// @param cap 0 = unlimited
    function setHolderCap(address account, uint256 cap) external onlyOwner {
        holderCap[account] = cap;
        emit HolderCapUpdated(account, cap);
    }

    function setTransfersPaused(bool paused) external onlyOwner {
        transfersPaused = paused;
        emit TransfersPaused(paused);
    }

    function isWhitelisted(address account) public view returns (bool) {
        return whitelisted[account] && !transfersPaused;
    }
}
