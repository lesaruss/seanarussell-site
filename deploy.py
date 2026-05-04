#!/usr/bin/env python3
"""
deploy.py — seanarussell-site Vercel deployer
Usage: python3 deploy.py YOUR_VERCEL_TOKEN
"""
import sys, os, json, hashlib, urllib.request, urllib.error

TOKEN      = sys.argv[1] if len(sys.argv) > 1 else ""
PROJECT_ID = "prj_3yey1dF5tCLQIXiahJA5vPCvRO6H"
TEAM_ID    = "team_G2qO2cUYl8ZmeOMaamFvY8C6"
GOOD_DEP   = "dpl_BRJyox29xiDopbtEXTk5VsYFMdnV"
HERE       = os.path.dirname(os.path.abspath(__file__))
LOCAL_HTML = {"actor.html","author.html","consultant.html",
              "host.html","producer.html","speaker.html",
              "book.html","index.html","universe.html"}

def api_get(path):
    req = urllib.request.Request(f"https://api.vercel.com{path}",
          headers={"Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def api_post(path, body):
    req = urllib.request.Request(f"https://api.vercel.com{path}",
          data=json.dumps(body).encode(),
          headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
          method="POST")
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def upload(content, sha):
    ext = ".html"
    req = urllib.request.Request(
        f"https://api.vercel.com/v2/files?teamId={TEAM_ID}",
        data=content,
        headers={"Authorization": f"Bearer {TOKEN}",
                 "Content-Type": "text/html; charset=utf-8",
                 "x-vercel-digest": sha},
        method="POST")
    try:
        with urllib.request.urlopen(req) as r: r.read()
    except urllib.error.HTTPError as e:
        if e.code != 409: raise

def flatten(items, prefix=""):
    out = {}
    for item in items:
        name = (prefix + item["name"]) if prefix else item["name"]
        if item.get("type") == "directory":
            out.update(flatten(item.get("children",[]), name+"/"))
        else:
            out[name] = {"uid": item.get("uid",""), "size": item.get("contentLength", 0)}
    return out

# 1. Get all files from the original working deployment
print("Getting file list from original deployment...")
raw   = api_get(f"/v6/deployments/{GOOD_DEP}/files?teamId={TEAM_ID}")
items = raw if isinstance(raw, list) else raw.get("files",[])
remote = flatten(items)

# Build dep_files starting from original (stripping "src/" prefix from paths)
dep_files = []
for src_path, meta in remote.items():
    clean = src_path[4:] if src_path.startswith("src/") else src_path
    local_name = os.path.basename(clean)

    if local_name in LOCAL_HTML:
        # We'll replace this with our local version below
        continue

    # Reuse original SHA directly — no download needed
    dep_files.append({"file": clean, "sha": meta["uid"], "size": meta["size"]})
    print(f"  KEEP  {clean}")

# 2. Upload only our 6 updated HTML files
print("\nUploading updated HTML files...")
for fname in LOCAL_HTML:
    local_path = os.path.join(HERE, fname)
    if not os.path.exists(local_path):
        print(f"  MISSING {fname}, skipping")
        continue
    with open(local_path, "rb") as f: content = f.read()
    sha  = hashlib.sha1(content).hexdigest()
    size = len(content)
    upload(content, sha)
    dep_files.append({"file": fname, "sha": sha, "size": size})
    print(f"  UPLOAD {fname} ({size:,} bytes)")

# 3. Create deployment
print(f"\nCreating deployment with {len(dep_files)} files...")
result = api_post(f"/v13/deployments?teamId={TEAM_ID}&projectId={PROJECT_ID}", {
    "name": "seanarussell-site",
    "files": dep_files,
    "projectSettings": {"outputDirectory": "", "framework": None},
    "target": "production",
})
url = result.get("url","")
print(f"\n{result.get('readyState','')}")
print(f"https://{url}" if url and not url.startswith("http") else url)
print(f"ID: {result.get('id','')}")
