"""Build the branded PDF of INSTALL.md (maintainer tool, not needed by customers).

    pip install markdown playwright   # once; then: playwright install chromium (if no Chromium is present)
    python tools/build_guide_pdf.py   # -> docs/3C-ITS-Installation-Guide.pdf
"""
from __future__ import annotations

import base64
import os
import re
import sys
from datetime import date

import markdown

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "INSTALL.md")
OUT = os.path.join(ROOT, "docs", "3C-ITS-Installation-Guide.pdf")
LOGO = os.path.join(ROOT, "npu_monitor", "static", "3c-its-logo.png")

CSS = """
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
* { box-sizing: border-box; }
body { font: 10.5pt/1.5 "Segoe UI", "Inter", "DejaVu Sans", Arial, sans-serif; color: #0a2a22; }
.cover { height: 255mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
.cover .band { height: 14mm; border-radius: 4mm; background: repeating-linear-gradient(-18deg, rgba(255,255,255,.18) 0 2px, transparent 2px 12px), linear-gradient(100deg,#04735f,#0a3d32); }
.cover img { height: 26mm; margin-top: 30mm; }
.cover h1 { font-size: 30pt; line-height: 1.1; color: #04735f; margin: 14mm 0 4mm; }
.cover .sub { font-size: 15pt; color: #3f5f56; }
.cover .tag { font-size: 18pt; font-weight: 700; color: #0a2a22; margin-top: 12mm; }
.cover .tag span { color: #19a586; }
.cover .meta { color: #5f7d74; font-size: 10pt; }
h1, h1 + h2, h1 + h2 + p { display: none; }   /* title and tagline are on the cover */
h2 { font-size: 15pt; color: #04735f; border-left: 4px solid #19a586; padding-left: 8px; margin: 18px 0 8px; page-break-after: avoid; }
h3 { font-size: 12pt; color: #075a4a; margin: 14px 0 6px; page-break-after: avoid; }
h2 + p em { color: #3f5f56; }
p, li { orphans: 3; widows: 3; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 9.3pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #e8f3ef; color: #04735f; text-align: left; font-weight: 600; }
th, td { border: 1px solid #cfe1da; padding: 5px 7px; vertical-align: top; }
code { font-family: Consolas, "DejaVu Sans Mono", monospace; font-size: 9pt; background: #f1f7f5; padding: 1px 4px; border-radius: 3px; }
pre { background: #0b2a22; color: #e6f2ee; padding: 9px 11px; border-radius: 6px; white-space: pre-wrap; word-break: break-all; page-break-inside: avoid; }
pre code { background: none; color: inherit; padding: 0; font-size: 8.8pt; }
blockquote { margin: 8px 0; padding: 6px 12px; border-left: 4px solid #f0b545; background: #fff8e6; color: #5a4300; }
hr { border: 0; border-top: 1px solid #cfe1da; margin: 14px 0; }
a { color: #04735f; text-decoration: none; }
ul.task-list, li.task { list-style: none; }
img.inline-logo { display: none; }
"""


def build_html() -> str:
    with open(SRC, encoding="utf-8") as f:
        md = f.read()
    md = re.sub(r"^<img[^>]*>\s*", "", md)                       # logo goes on the cover instead
    md = md.replace("- [ ]", "- ☐")
    body = markdown.markdown(md, extensions=["tables", "fenced_code", "toc", "sane_lists"])
    logo = "data:image/png;base64," + base64.b64encode(open(LOGO, "rb").read()).decode()
    cover = f"""<section class="cover">
      <div><div class="band"></div><img src="{logo}" alt="3C ITS – Make IT Simple">
        <h1 style="display:block">Installation Guide</h1>
        <div class="sub">3C ITS AI PC Health Checker &amp; NPU Performance</div>
        <div class="tag">We Care. <span>We Build.</span> We Transform.</div>
        <div class="sub" style="margin-top:3mm">Your technology, transformed with AI infrastructure.</div></div>
      <div class="meta">Prerequisites · Windows and Linux installation · Portal set-up · Offline installation · Troubleshooting<br>
        Version {date.today().isoformat()}</div>
    </section>"""
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{cover}{body}</body></html>"


def main() -> int:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    html = build_html()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        tmp = OUT.replace(".pdf", ".html")
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"playwright (Python) not installed - wrote {tmp}; open it in a browser and Print > Save as PDF.")
        return 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(html, wait_until="load")
        page.pdf(path=OUT, format="A4", print_background=True, display_header_footer=True,
                 margin={"top": "18mm", "bottom": "18mm", "left": "16mm", "right": "16mm"},
                 header_template="<div></div>",
                 footer_template="<div style='font-size:8px;width:100%;padding:0 16mm;color:#5f7d74;display:flex;justify-content:space-between'>"
                                 "<span>3C ITS AI PC Health Checker &amp; NPU Performance · Installation Guide</span>"
                                 "<span><span class='pageNumber'></span> / <span class='totalPages'></span></span></div>")
        browser.close()
    print(f"wrote {OUT} ({os.path.getsize(OUT) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
