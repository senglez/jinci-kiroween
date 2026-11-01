"""Download rendered page thumbnails of a Commons PDF (page N) via the imageinfo API."""
import json, sys, time, urllib.parse, urllib.request
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "KiroweenJinciResearch/1.0 (contact: research@example.com)"}
title, outdir, first, last, width = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
def fetch(url, binary=False):
    for a in range(6):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
            return data if binary else json.loads(data)
        except Exception as e:
            err = e; time.sleep(10 * (a + 1))
    raise err
for n in range(first, last + 1):
    q = {"action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url|size", "iiurlparam": f"page{n}-{width}px", "format": "json"}
    r = fetch(API + "?" + urllib.parse.urlencode(q))
    ii = list(r["query"]["pages"].values())[0]["imageinfo"][0]
    if n == first: print("pages:", ii.get("pagecount"), flush=True)
    img = fetch(ii["thumburl"], binary=True)
    open(f"{outdir}/p{n:03d}.jpg", "wb").write(img)
    print(n, len(img), flush=True); time.sleep(1.5)
