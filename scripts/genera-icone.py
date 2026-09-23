import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 1024
FONT = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
import os

# Rigenera le icone della PWA: python3 scripts/genera-icone.py (richiede Pillow e il font Noto Sans Bold)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "icons")

def gradiente(size, top, bottom):
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=c)
    return img

def pallone(d, cx, cy, r):
    # pallone stilizzato: cerchio bianco, pentagono centrale scuro e cuciture
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill="white")
    def pent(cx0, cy0, rr, rot):
        return [(cx0 + rr * math.cos(rot + i * 2 * math.pi / 5), cy0 + rr * math.sin(rot + i * 2 * math.pi / 5)) for i in range(5)]
    centro = pent(cx, cy, r * 0.38, -math.pi / 2)
    d.polygon(centro, fill="#10231a")
    for i, (px, py) in enumerate(centro):
        ang = math.atan2(py - cy, px - cx)
        ex, ey = cx + r * 0.78 * math.cos(ang), cy + r * 0.78 * math.sin(ang)
        d.line([(px, py), (ex, ey)], fill="#10231a", width=max(2, round(r * 0.07)))
        # mezzi pentagoni sul bordo
        d.polygon(pent(cx + r * 0.95 * math.cos(ang), cy + r * 0.95 * math.sin(ang), r * 0.26, ang + math.pi / 5), fill="#10231a")

def disegna():
    img = gradiente(S, (22, 120, 72), (8, 60, 40))
    campo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dc = ImageDraw.Draw(campo)
    linea = (255, 255, 255, 38)
    w = 14
    # linea di meta' campo e cerchio di centrocampo, leggeri sullo sfondo
    dc.line([(0, S * 0.5), (S, S * 0.5)], fill=linea, width=w)
    rc = S * 0.28
    dc.ellipse([S / 2 - rc, S / 2 - rc, S / 2 + rc, S / 2 + rc], outline=linea, width=w)
    # strisce del prato
    for i in range(0, 8, 2):
        dc.rectangle([0, i * S / 8, S, (i + 1) * S / 8], fill=(255, 255, 255, 10))
    img = Image.alpha_composite(img.convert("RGBA"), campo)

    # "F" con ombra morbida
    font = ImageFont.truetype(FONT, 620)
    testo = "F"
    ombra = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    do = ImageDraw.Draw(ombra)
    cx, cy = S * 0.46, S * 0.47
    do.text((cx + 10, cy + 18), testo, font=font, fill=(0, 0, 0, 120), anchor="mm")
    ombra = ombra.filter(ImageFilter.GaussianBlur(18))
    img = Image.alpha_composite(img, ombra)
    d = ImageDraw.Draw(img)
    d.text((cx, cy), testo, font=font, fill="white", anchor="mm")

    # pallone in basso a destra della F, dentro la zona sicura (cerchio di raggio 0.4*S)
    pr = S * 0.105
    px, py = S * 0.655, S * 0.655
    ob = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(ob).ellipse([px - pr + 6, py - pr + 12, px + pr + 6, py + pr + 12], fill=(0, 0, 0, 110))
    img = Image.alpha_composite(img, ob.filter(ImageFilter.GaussianBlur(10)))
    palla = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    pallone(ImageDraw.Draw(palla), px, py, pr)
    # ritaglia al cerchio del pallone
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).ellipse([px - pr, py - pr, px + pr, py + pr], fill=255)
    palla.putalpha(Image.composite(palla.getchannel("A"), Image.new("L", (S, S), 0), m))
    img = Image.alpha_composite(img, palla)
    ImageDraw.Draw(img).ellipse([px - pr, py - pr, px + pr, py + pr], outline="#10231a", width=8)
    return img.convert("RGB")

icona = disegna()
for size in (512, 192):
    icona.resize((size, size), Image.LANCZOS).save(f"{OUT}/icon-{size}.png", optimize=True)
icona.resize((180, 180), Image.LANCZOS).save(f"{OUT}/apple-touch-icon.png", optimize=True)
icona.resize((64, 64), Image.LANCZOS).save(f"{OUT}/favicon-64.png", optimize=True)
print("ok")
