// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AttestPay AttestationRegistry
/// @notice On-chain audit trail for AI-agent decisions. The agent signs an
///         EIP-712 typed attestation off-chain and submits the hash here so
///         every distribution is provably linked to a verified decision and
///         a named data source. Anyone can verify signature + record.
contract AttestationRegistry {
    struct Attestation {
        bytes32 uid;          // keccak of pool+cycle
        address pool;
        uint256 cycleId;
        uint256 grossAmount;  // income being recognized (payment token decimals)
        bytes32 evidenceHash; // keccak of the parsed income evidence
        string sourceRef;     // named real data source URI
        address signer;       // agent signer address
        uint256 blockNumber;
        uint256 timestamp;
    }

    address public owner;
    mapping(bytes32 => Attestation) public attestations;
    uint256 public count;

    event AttestationRecorded(
        bytes32 indexed uid,
        address indexed pool,
        uint256 indexed cycleId,
        uint256 grossAmount,
        bytes32 evidenceHash,
        string sourceRef,
        address signer,
        uint256 timestamp
    );
    event OwnerChanged(address indexed previous, address indexed current);

    error OnlyOwner();
    error ZeroAddress();
    error AlreadyAttested(bytes32 uid);
    error EmptyEvidence();
    error ZeroAmount();

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

    /// @notice Records a verified agent decision. The agent submits its
    ///         signed digest; the registry records it permanently.
    function record(
        address pool_,
        uint256 cycleId,
        uint256 grossAmount,
        bytes32 evidenceHash,
        string calldata sourceRef
    ) external returns (bytes32 uid) {
        if (bytes(sourceRef).length == 0) revert EmptyEvidence();
        if (grossAmount == 0) revert ZeroAmount();
        uid = keccak256(abi.encodePacked(pool_, cycleId));
        if (attestations[uid].pool != address(0)) revert AlreadyAttested(uid);
        attestations[uid] = Attestation({
            uid: uid,
            pool: pool_,
            cycleId: cycleId,
            grossAmount: grossAmount,
            evidenceHash: evidenceHash,
            sourceRef: sourceRef,
            signer: msg.sender,
            blockNumber: block.number,
            timestamp: block.timestamp
        });
        count++;
        emit AttestationRecorded(uid, pool_, cycleId, grossAmount, evidenceHash, sourceRef, msg.sender, block.timestamp);
    }

    function get(bytes32 uid) external view returns (Attestation memory) {
        return attestations[uid];
    }
}