#!/usr/bin/env python3
"""Verify an DoleAI contract on scan.bohr.life (Blockscout v2) via sourcify-style POST."""
import json, sys, subprocess, urllib.request, urllib.error

addr, src_path = sys.argv[1], sys.argv[2]
contract_id = src_path.split(":")[1] if ":" in src_path else None

meta = json.loads(subprocess.run(["forge", "inspect", src_path, "metadata"], capture_output=True, text=True).stdout)
flattened = subprocess.run(["forge", "flatten", src_path], capture_output=True, text=True).stdout

# Blockscout v2 /verification/via/multipart-file or /via/standard-input
payload = {
    "compiler_version": meta["compiler"]["version"],
    "evm_version": "paris",
    "optimization_enabled": True,
    "optimization_runs": meta["settings"]["optimizer"].get("runs", 200),
    "source_code": flattened,
    "constructor_arguments": "",
    "name": contract_id or "Pool",
}
body = json.dumps(payload)
url = f"https://scan.bohr.life/api/v2/smart-contracts/{addr}/verification/via/standard-input"
req = urllib.request.Request(url, data=body.encode(), method="POST")
req.add_header("Content-Type", "application/json")
req.add_header("accept", "application/json")
try:
    r = urllib.request.urlopen(req, timeout=60)
    print("VERIFY OK", r.status, r.read()[:300])
except urllib.error.HTTPError as e:
    print("VERIFY HTTP", e.code, e.read()[:400])
except Exception as e:
    print("VERIFY ERR", e)
