#!/usr/bin/env python3
"""
fetch-assets.py — downloads all images and missing HTML from the working deployment
Usage: python3 fetch-assets.py YOUR_VERCEL_TOKEN
"""
import sys, os, json, urllib.request

TOKEN    = sys.argv[1] if len(sys.argv) > 1 else ""
GOOD_DEP = "dpl_CGobVgSk4qBingorXXFF7e1pLhae"
TEAM_ID  = "team_G2qO2cUYl8ZmeOMaamFvY8C6"
HERE     = os.path.dirname(os.path.abspath(__file__))

def api(path):
    req = urllib.request.Request(
        f"https://api.vercel.com{path}",
        headers={"Authorization": f"Bearer {TOKEN}", "Accept-Encoding": "identity"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def flatten(items, prefix=""):
    out = {}
    for item in items:
        name = (prefix + item["name"]) if prefix else item["name"]
        if item.get("type") == "directory":
            out.update(flatten(item.get("children", []), name + "/"))
        else:
            out[name] = item.get("uid","")
    return out

# Get file list
print("Fetching file list...")
raw   = json.loads(api(f"/v6/deployments/{GOOD_DEP}/files?teamId={TEAM_ID}"))
items = raw if isinstance(raw, list) else raw.get("files", [])
files = flatten(items)

# Download each file, strip the "src/" prefix, save locally
for src_path, uid in sorted(files.items()):
    local_path = src_path[4:] if src_path.startswith("src/") else src_path
    dest = os.path.join(HERE, local_path.replace("/", os.sep))

    if os.path.exists(dest):
        print(f"  EXISTS  {local_path}")
        continue

    print(f"  GET     {local_path} ...", end=" ", flush=True)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    data = api(f"/v7/deployments/{GOOD_DEP}/files/{uid}?teamId={TEAM_ID}")
    with open(dest, "wb") as f:
        f.write(data)
    print(f"{len(data):,} bytes")

print("\nDone. All assets saved locally.")
print("Now run: python3 deploy.py YOUR_TOKEN")
