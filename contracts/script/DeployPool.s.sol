// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Pool} from "../src/Pool.sol";
import {AssetToken} from "../src/AssetToken.sol";
import {PolicyRegistry} from "../src/PolicyRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";

/// @notice Deploys an AttestPay pool. Reads config from env, never hardcodes:
///   ATTESTPAY_PAYMENT_TOKEN - WBOT (or any ERC20) address
///   ATTESTPAY_OWNER        - owner address
///   ATTESTPAY_AGENT        - authorized AI-agent signer address
///   PRIVATE_KEY            - deployer private key
contract DeployPool is Script {
    function run() external returns (Pool pool) {
        address paymentToken = vm.envAddress("ATTESTPAY_PAYMENT_TOKEN");
        address owner = vm.envAddress("ATTESTPAY_OWNER");
        address agent = vm.envAddress("ATTESTPAY_AGENT");

        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPk);

        pool = new Pool(paymentToken, owner, agent);

        vm.stopBroadcast();

        console2.log("Pool deployed at:", address(pool));
        console2.log("AssetToken:", address(pool.assetToken()));
        console2.log("PolicyRegistry:", address(pool.policyRegistry()));
        console2.log("AttestationRegistry:", address(pool.attestationRegistry()));
        console2.log("PaymentToken:", paymentToken);
        console2.log("Owner:", owner);
        console2.log("Agent:", agent);
    }
}

// Onboarding (whitelist/caps) is performed via `cast send` by the owner.
// Example:
//   cast send $POOL "setWhitelisted(address,bool)" $ADDR true --rpc-url https://rpc.bohr.life --private-key $OWNER_PK