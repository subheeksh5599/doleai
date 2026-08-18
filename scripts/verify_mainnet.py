#!/usr/bin/env python3
"""Verify DoleAI contracts on BOT Chain MAINNET (scan.botchain.ai) via the
classic /api endpoint. Cloudflare (1010) blocks default urllib UA, so we send
a browser User-Agent. Same standard-json classic form as verify_blockscout_classic.py."""
import urllib.request, urllib.error, urllib.parse, json, subprocess, sys

API = "https://scan.botchain.ai/api"
CONTRACTS = [
    ("0x688D6d4f3769f219a40009108bC7c2ca4177c6fD", "src/Pool.sol:Pool"),
    ("0x17a8e184A1D5FecCC4e9728DBCAeB6Cb17d96583", "src/AssetToken.sol:AssetToken"),
    ("0x79D4Ce1c7Df6E7C640Db46C17E8a4bE2585EF491", "src/PolicyRegistry.sol:PolicyRegistry"),
    ("0xF442320f6d7FEC593Eb472856B89b1Cc2799eB41", "src/AttestationRegistry.sol:AttestationRegistry"),
]

def verify(addr, contract):
    src_path, name = contract.split(":")
    meta = json.loads(subprocess.run(["forge", "inspect", contract, "metadata"],
                                     capture_output=True, text=True).stdout)
    flat = subprocess.run(["forge", "flatten", src_path], capture_output=True, text=True).stdout
    runs = meta["settings"]["optimizer"].get("runs", 200)
    source_json = json.dumps({
        "language": "Solidity",
        "sources": {name + ".sol": {"content": flat}},
        "settings": {"optimizer": {"enabled": True, "runs": runs},
                     "evmVersion": "paris", "metadata": {"bytecodeHash": "ipfs"}},
    })
    data = urllib.parse.urlencode({
        "module": "contract", "action": "verifysourcecode",
        "contractaddress": addr, "sourceCode": source_json,
        "compilerversion": meta["compiler"]["version"],
        "contractname": name, "optimizationUsed": 1, "runs": runs,
        "evmversion": "paris", "codeformat": "solidity-standard-json-input",
        "constructorArguments": "",
    }).encode()
    req = urllib.request.Request(API, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    req.add_header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")
    req.add_header("Accept", "application/json")
    req.add_header("Origin", "https://scan.botchain.ai")
    try:
        r = urllib.request.urlopen(req, timeout=120)
        body = r.read().decode()
        print(f"{name:22s} => {body[:220]}")
    except urllib.error.HTTPError as e:
        print(f"{name:22s} HTTP {e.code} {e.read()[:220]}")

for addr, c in CONTRACTS:
    verify(addr, c)
