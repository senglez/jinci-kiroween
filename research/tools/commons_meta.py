"""Collect Wikimedia Commons metadata (license, author, URLs) for Jinci Saint Mother's Hall images."""
import json, re, sys, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "KiroweenJinciResearch/1.0 (contact: research@example.com)"}

def get(params):
    params = {**params, "format": "json"}
    for attempt in range(6):
        try:
            req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers=UA)
            return json.load(urllib.request.urlopen(req))
        except Exception:
            time.sleep(15 * (attempt + 1))
    raise RuntimeError("Commons API unavailable")

def category_files(cat):
    out, cont = [], {}
    while True:
        r = get({"action": "query", "list": "categorymembers", "cmtitle": cat, "cmtype": "file", "cmlimit": "500", **cont})
        out += [m["title"] for m in r["query"]["categorymembers"]]
        if "continue" not in r:
            return out
        cont = r["continue"]

def clean(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s or "")).strip()

def metadata(titles):
    res = []
    for i in range(0, len(titles), 40):
        r = get({"action": "query", "titles": "|".join(titles[i:i + 40]), "prop": "imageinfo",
                 "iiprop": "url|extmetadata|size|mime", "iiurlwidth": "1600"})
        for p in r["query"]["pages"].values():
            ii = p.get("imageinfo", [{}])[0]
            md = ii.get("extmetadata", {})
            g = lambda k: clean(md.get(k, {}).get("value", ""))
            res.append({"title": p["title"], "page": ii.get("descriptionurl"), "url": ii.get("url"),
                        "thumb": ii.get("thumburl"), "mime": ii.get("mime"), "width": ii.get("width"),
                        "height": ii.get("height"), "license": g("LicenseShortName"),
                        "license_url": g("LicenseUrl"), "artist": g("Artist"),
                        "date": g("DateTimeOriginal") or g("DateTime"), "description": g("ImageDescription")[:300]})
        time.sleep(2)
    return sorted(res, key=lambda x: x["title"])

if __name__ == "__main__":
    titles = category_files("Category:Saint Mother's Hall")
    titles += [t for t in sys.argv[1:] if t not in titles]
    json.dump(metadata(titles), sys.stdout, ensure_ascii=False, indent=1)
