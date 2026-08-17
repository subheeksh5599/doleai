#!/usr/bin/env python3
"""Verify an AttestPay contract on scan.bohr.life via the classic /api module=contract&action=verifysourcecode endpoint.
Usage: verify_named.py <address> <srcPath>:<ContractName>"""
import urllib.request, urllib.parse, json, subprocess, sys, time

addr, contract = sys.argv[1], sys.argv[2]
src_path, name = contract.split(":")
meta = json.loads(subprocess.run(["forge", "inspect", contract, "metadata"], capture_output=True, text=True).stdout)
flat = subprocess.run(["forge", "flatten", src_path], capture_output=True, text=True).stdout
# Flattened source uses the original import layout; for standard-json we can point the
# single flattened file at the contract name that blockscout greps.

source_json = json.dumps({
    "language": "Solidity",
    "sources": {name + ".sol": {"content": flat}},
    "settings": {"optimizer": {"enabled": True, "runs": 200}, "evmVersion": "paris", "metadata": {"bytecodeHash": "ipfs"}},
})
data = urllib.parse.urlencode({
    "module": "contract", "action": "verifysourcecode",
    "contractaddress": addr,
    "sourceCode": source_json,
    "compilerversion": meta["compiler"]["version"],
    "contractname": name, "optimizationUsed": 1, "runs": 200, "evmversion": "paris",
    "codeformat": "solidity-standard-json-input", "constructorArguments": "",
}).encode()
req = urllib.request.Request("https://scan.bohr.life/api", data=data, method="POST")
req.add_header("Content-Type", "application/x-www-form-urlencoded")
try:
    r = urllib.request.urlopen(req, timeout=90)
    print(name, "=>", r.read()[:200])
except urllib.error.HTTPError as e:
    print(name, "HTTP", e.code, e.read()[:200])
