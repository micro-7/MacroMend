"""Generates the MacroMend icon set into assets/. Run: python3 scripts/make-icons.py (needs Pillow)."""
from PIL import Image, ImageDraw

GREEN = (46, 125, 50, 255)
LIGHT = (232, 245, 233, 255)
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)
S = 4  # supersampling


def mark(size, fg, accent, scale):
    """The mark: a plate ring with a bold M inside. `scale` is the share of the canvas it occupies."""
    n = size * S
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = n / 2
    r = n * scale / 2
    ring = r * 0.14
    d.ellipse([c - r, c - r, c + r, c + r], outline=fg, width=int(ring))
    # M built from four strokes of one thickness
    w = r * 1.0   # half width of the M
    h = r * 0.62  # half height
    t = r * 0.22  # stroke thickness
    top, bot = c - h, c + h
    left, right = c - w * 0.62, c + w * 0.62
    d.rectangle([left, top, left + t, bot], fill=fg)
    d.rectangle([right - t, top, right, bot], fill=fg)
    mid = c
    d.polygon([(left, top), (left + t * 1.25, top), (mid, c + h * 0.15), (mid - t * 0.0, c + h * 0.15 + t * 1.1)], fill=fg)
    d.polygon([(right, top), (right - t * 1.25, top), (mid, c + h * 0.15), (mid + t * 0.0, c + h * 0.15 + t * 1.1)], fill=fg)
    # a small dot above the middle of the M: a mended gap
    dr = t * 0.5
    d.ellipse([c - dr, top - dr * 1.1 - t * 0.2, c + dr, top + dr * 0.9 - t * 0.2], fill=accent)
    return img.resize((size, size), Image.LANCZOS)


def solid(size, color):
    return Image.new('RGBA', (size, size), color)


# Full icon (iOS/legacy/web): green square, white mark.
icon = solid(1024, GREEN)
icon.alpha_composite(mark(1024, WHITE, LIGHT, 0.68))
icon.convert('RGB').save('assets/icon.png')

# Adaptive icon: the system masks the outer third, so the mark stays inside the 66% safe zone.
solid(512, GREEN).save('assets/android-icon-background.png')
mark(512, WHITE, LIGHT, 0.60).save('assets/android-icon-foreground.png')
# Themed (monochrome) icon: shape only.
mark(432, BLACK, BLACK, 0.60).save('assets/android-icon-monochrome.png')

# Splash: green mark on the splash background colour (set in app.json).
mark(1024, GREEN, GREEN, 0.60).save('assets/splash-icon.png')
# Favicon
solid(48, GREEN).save('assets/favicon.png')
f = solid(48, GREEN)
f.alpha_composite(mark(48, WHITE, LIGHT, 0.80))
f.convert('RGB').save('assets/favicon.png')
