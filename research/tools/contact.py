"""Make a labelled contact sheet from p*.jpg page thumbnails: contact.py <dir> <out.jpg>"""
import glob
import sys

from PIL import Image, ImageDraw

files = sorted(glob.glob(sys.argv[1] + "/p*.jpg"))
out = sys.argv[2]
cols, w = 6, 260
ims = [Image.open(f).convert("RGB") for f in files]
h = max(int(i.height * w / i.width) for i in ims) + 20
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), "white")
d = ImageDraw.Draw(sheet)
for k, (f, im) in enumerate(zip(files, ims)):
    im = im.resize((w, int(im.height * w / im.width)))
    x, y = (k % cols) * w, (k // cols) * h
    sheet.paste(im, (x, y + 20))
    d.text((x + 4, y + 4), f.split("/")[-1], fill="red")
sheet.save(out, quality=80)
