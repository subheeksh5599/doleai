#!/usr/bin/env python3
"""Verify on chain using standard-json-input (the format Blockscout v2 truly needs)."""
import subprocess, json, urllib.request, urllib.error, sys, base64

addr = sys.argv[1]
# Build standard JSON input from forge via `forge build --json` metadata.
meta = json.loads(subprocess.run(["forge", "inspect", "src/Pool.sol:Pool", "metadata"], capture_output=True, text=True).stdout)
flattened = subprocess.run(["forge", "flatten", "src/Pool.sol"], capture_output=True, text=True).stdout

std_json = {
    "language": "Solidity",
    "sources": {"src/Pool.sol": {"content": flattened}},
    "settings": {
        "optimizer": {"enabled": True, "runs": meta["settings"]["optimizer"].get("runs", 200)},
        "evmVersion": "paris",
        "metadata": {"bytecodeHash": "ipfs"},
        "outputSelection": {"*": {"*": ["abi", "evm.bytecode"]}},
    },
}
sourceUri = "data:application/json;base64," + base64.b64encode(json.dumps(std_json).encode()).decode()

payload = {
    "compiler_version": meta["compiler"]["version"],
    "compilation_platform": "solidity-standard-json-input",
    "source_code": sourceUri,
    "is_blueprint": False,
    "constructor_args": "",
    "is_optimized": True,
    "optimization_runs": 200,
    "evm_version": "paris",
}
body = json.dumps(payload)
url = f"https://scan.bohr.life/api/v2/smart-contracts/{addr}/verification/via/standard-input"
req = urllib.request.Request(url, data=body.encode(), method="POST")
req.add_header("Content-Type", "application/json")
req.add_header("accept", "application/json")
try:
    r = urllib.request.urlopen(req, timeout=90)
    print("VERIFY OK", r.status, r.read()[:400])
except urllib.error.HTTPError as e:
    print("VERIFY HTTP", e.code, e.read()[:800])
