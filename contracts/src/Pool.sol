// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AssetToken} from "./AssetToken.sol";
import {PolicyRegistry} from "./PolicyRegistry.sol";
import {AttestationRegistry} from "./AttestationRegistry.sol";

interface IPaymentToken {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

/// @title DoleAI Pool
/// @notice Tokenized revenue pool on BOT Chain. Investors buy AssetToken
///         shares with a payment token (e.g. WBOT). The AI agent (authorized
///         signer) verifies income events off-chain, records an on-chain
///         attestation, then triggers prorata distribution: every holder
///         receives their share of recognized income in the payment token.
///         Redemption returns prorata principal. No hardcoded values; all
///         addresses are constructor params.
contract Pool {
    AssetToken public immutable assetToken;
    PolicyRegistry public immutable policyRegistry;
    AttestationRegistry public immutable attestationRegistry;
    address public immutable paymentToken; // e.g. WBOT (18 decimals) on BOT Chain
    address public owner;
    address public agent; // authorized AI-agent signer

    uint32 public constant MAX_BATCH = 200;

    struct Distribution {
        uint256 id;
        uint256 cycleId;
        uint256 grossAmount;
        uint256 totalPaid;
        uint256 recipientCount;
        uint256 timestamp;
        bytes32 attestationUid;
    }

    mapping(uint256 => Distribution) public distributions;
    uint256 public nextDistId = 1;
    bool public paused;

    // Holder index (registered on first buy/issue; keeps distribution efficient)
    address[] internal _holders;
    mapping(address => bool) internal _isHolder;

    event Issue(address indexed investor, uint256 shares, uint256 paid);
    event Buy(address indexed investor, uint256 shares, uint256 paid);
    event Redeem(address indexed investor, uint256 sharesReturned, uint256 payout);
    event DistributionExecuted(
        uint256 indexed id,
        uint256 indexed cycleId,
        uint256 grossAmount,
        uint256 totalPaid,
        uint256 recipientCount,
        bytes32 attestationUid
    );
    event AgentChanged(address indexed previous, address indexed current);
    event OwnerChanged(address indexed previous, address indexed current);
    event Paused(bool paused);

    error OnlyOwner();
    error OnlyAgent();
    error PausedError();
    error ZeroAddress();
    error ZeroAmount();
    error ExceedsReserves(uint256 requested, uint256 available);
    error BadAttestation(bytes32 uid);
    error NotWhitelisted(address account);
    error NoHolders();
    error CapExceeded(address account, uint256 cap);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    modifier onlyAgent() {
        if (msg.sender != agent) revert OnlyAgent();
        _;
    }
    modifier whenNotPaused() {
        if (paused) revert PausedError();
        _;
    }

    constructor(address paymentToken_, address owner_, address agent_) {
        if (paymentToken_ == address(0) || owner_ == address(0) || agent_ == address(0)) {
            revert ZeroAddress();
        }
        paymentToken = paymentToken_;
        owner = owner_;
        agent = agent_;
        // PolicyRegistry is owned by the pool so compliance calls go through
        // pool admin controls; AttestationRegistry is owned by the pool owner
        // (human) so attestations remain append-only by the agent.
        policyRegistry = new PolicyRegistry(address(this));
        attestationRegistry = new AttestationRegistry(owner_);
        assetToken = new AssetToken("DoleAI Revenue Share", "DOLET", address(this), address(policyRegistry));
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------
    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setAgent(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert ZeroAddress();
        emit AgentChanged(agent, newAgent);
        agent = newAgent;
    }

    function setPaused(bool value) external onlyOwner {
        paused = value;
        emit Paused(value);
    }

    function setWhitelisted(address account, bool status) external onlyOwner {
        policyRegistry.setWhitelisted(account, status);
    }

    function setHolderCap(address account, uint256 cap) external onlyOwner {
        policyRegistry.setHolderCap(account, cap);
    }

    // ---------------------------------------------------------------------
    // Issuance & placement
    // ---------------------------------------------------------------------
    /// @notice Issuer subscribes to the pool; investors buy shares at face
    ///         value 1:1 with the payment token.
    function subscribe(uint256 paymentAmount) external whenNotPaused {
        if (paymentAmount == 0) revert ZeroAmount();
        _mintFromPayment(msg.sender, paymentAmount);
        emit Issue(msg.sender, paymentAmount, paymentAmount);
    }

    function buy(uint256 paymentAmount) external whenNotPaused {
        if (paymentAmount == 0) revert ZeroAmount();
        _mintFromPayment(msg.sender, paymentAmount);
        emit Buy(msg.sender, paymentAmount, paymentAmount);
    }

    /// @notice Investor redeems shares for prorata principal from pool reserves.
    function redeem(uint256 shares) external whenNotPaused {
        if (shares == 0) revert ZeroAmount();
        _requireWhitelisted(msg.sender);
        uint256 total = assetToken.totalSupply();
        if (total == 0) revert NoHolders();
        uint256 toWithdraw = (paymentBalance() * shares) / total;
        assetToken.burn(msg.sender, shares);
        _safeTransfer(paymentToken, msg.sender, toWithdraw);
        emit Redeem(msg.sender, shares, toWithdraw);
    }

    // ---------------------------------------------------------------------
    // AI-agent distribution
    // ---------------------------------------------------------------------
    /// @notice Pro-rata distribution of recognized income. Callable only by
    ///         the authorized agent signer. Requires a valid on-chain
    ///         attestation for the cycle recorded by the agent.
    function distribute(uint256 grossAmount, uint256 cycleId, bytes32 attestationUid) external onlyAgent whenNotPaused {
        if (grossAmount == 0) revert ZeroAmount();
        uint256 available = paymentBalance();
        if (available < grossAmount) revert ExceedsReserves(grossAmount, available);

        AttestationRegistry.Attestation memory att = attestationRegistry.get(attestationUid);
        if (att.pool != address(this) || att.cycleId != cycleId || att.grossAmount != grossAmount) {
            revert BadAttestation(attestationUid);
        }

        uint256 n = _holders.length;
        if (n == 0) revert NoHolders();

        uint256 total = assetToken.totalSupply();
        uint256 gross = grossAmount;
        uint256 totalToPay = 0;
        // Second pass count of active holders with balance.
        uint256 active = 0;
        for (uint256 i = 0; i < n; i++) {
            if (assetToken.balanceOf(_holders[i]) > 0) active++;
        }
        if (active == 0) revert NoHolders();

        uint256 remaining = gross;
        uint256 paidCount = 0;
        for (uint256 i = 0; i < n && paidCount < active; i++) {
            address h = _holders[i];
            uint256 bal = assetToken.balanceOf(h);
            if (bal == 0) continue;
            uint256 share;
            if (paidCount == active - 1) {
                share = remaining; // last active holder absorbs rounding dust
            } else {
                share = (gross * bal) / total;
            }
            remaining -= share;
            _safeTransfer(paymentToken, h, share);
            totalToPay += share;
            paidCount++;
        }

        distributions[nextDistId] = Distribution({
            id: nextDistId,
            cycleId: cycleId,
            grossAmount: gross,
            totalPaid: totalToPay,
            recipientCount: paidCount,
            timestamp: block.timestamp,
            attestationUid: attestationUid
        });
        emit DistributionExecuted(nextDistId, cycleId, gross, totalToPay, paidCount, attestationUid);
        nextDistId++;
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------
    function paymentBalance() public view returns (uint256) {
        return IPaymentToken(paymentToken).balanceOf(address(this));
    }

    function holderCount() external view returns (uint256) {
        return _holders.length;
    }

    function holders(uint256 i) external view returns (address) {
        return _holders[i];
    }

    function getDistribution(uint256 id) external view returns (Distribution memory) {
        return distributions[id];
    }

    function allDistributions() external view returns (Distribution[] memory out) {
        out = new Distribution[](nextDistId - 1);
        for (uint256 i = 1; i < nextDistId; i++) {
            out[i - 1] = distributions[i];
        }
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------
    function _mintFromPayment(address to, uint256 amount) internal {
        // Compliance cap check on subscription as well (mint path).
        uint256 cap = policyRegistry.holderCap(to);
        if (cap != 0 && assetToken.balanceOf(to) + amount > cap) revert CapExceeded(to, cap);
        if (!_isHolder[to]) {
            _isHolder[to] = true;
            _holders.push(to);
        }
        _safeTransferFrom(paymentToken, msg.sender, address(this), amount);
        assetToken.mint(to, amount);
    }

    function _requireWhitelisted(address account) internal view {
        if (!policyRegistry.whitelisted(account)) revert NotWhitelisted(account);
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(IPaymentToken.transfer.selector, to, amount));
        require(ok && (ret.length == 0 || abi.decode(ret, (bool))), "transfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory ret) =
            token.call(abi.encodeWithSelector(IPaymentToken.transferFrom.selector, from, to, amount));
        require(ok && (ret.length == 0 || abi.decode(ret, (bool))), "transferFrom failed");
    }
}
