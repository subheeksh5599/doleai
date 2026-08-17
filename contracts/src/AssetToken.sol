// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PolicyRegistry} from "./PolicyRegistry.sol";

/// @title AttestPay AssetToken
/// @notice ERC-20 share token of a tokenized revenue pool. Minting and burning
///         are restricted to the pool contract. Every transfer is checked
///         against the pool's compliance policy (whitelist + per-holder cap).
///         No hardcoded addresses; the pool and policy are constructor params.
contract AssetToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    address public immutable pool;
    address public immutable policyRegistry;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error Unauthorized();
    error TransferBlocked(address from, address to, uint256 amount, string reason);
    error ZeroAddress();

    constructor(string memory name_, string memory symbol_, address pool_, address policyRegistry_) {
        if (pool_ == address(0) || policyRegistry_ == address(0)) revert ZeroAddress();
        name = name_;
        symbol = symbol_;
        pool = pool_;
        policyRegistry = policyRegistry_;
    }

    modifier onlyPool() {
        if (msg.sender != pool) revert Unauthorized();
        _;
    }

    function mint(address to, uint256 amount) external onlyPool {
        if (to == address(0)) revert ZeroAddress();
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyPool {
        if (balanceOf[from] < amount) revert InsufficientBalance(from, amount);
        totalSupply -= amount;
        balanceOf[from] -= amount;
        emit Transfer(from, address(0), amount);
    }

    error InsufficientBalance(address account, uint256 amount);
    error InsufficientAllowance(address owner, address spender, uint256 amount);

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance(from, msg.sender, amount);
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (balanceOf[from] < amount) revert InsufficientBalance(from, amount);
        // Compliance gate: whitelist + per-holder cap (both pools and investors).
        PolicyRegistry policy = PolicyRegistry(policyRegistry);
        if (!policy.isWhitelisted(from)) revert TransferBlocked(from, to, amount, "sender-not-whitelisted");
        if (!policy.isWhitelisted(to)) revert TransferBlocked(from, to, amount, "recipient-not-whitelisted");
        uint256 cap = policy.holderCap(to);
        if (cap != 0 && balanceOf[to] + amount > cap) revert TransferBlocked(from, to, amount, "holder-cap-exceeded");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}