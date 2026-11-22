"""Turn uploaded documents into images the vision model can process.

Supported: PNG/JPEG/BMP/GIF/TIFF/WebP images, PDF (each page rendered plus every
embedded picture), Excel .xlsx/.xlsm (each sheet rendered as a heat-mapped grid,
every embedded picture/chart image, plus numeric statistics) and CSV.
"""
from __future__ import annotations

import csv
import io
import os
from dataclasses import dataclass, field

from PIL import Image, ImageDraw, ImageFont

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tif", ".tiff", ".webp"}
PDF_EXT = {".pdf"}
EXCEL_EXT = {".xlsx", ".xlsm"}
CSV_EXT = {".csv"}
SUPPORTED = IMAGE_EXT | PDF_EXT | EXCEL_EXT | CSV_EXT

MAX_PDF_PAGES = int(os.environ.get("NPU_MONITOR_MAX_PDF_PAGES", "50"))
MAX_ITEMS = int(os.environ.get("NPU_MONITOR_MAX_ITEMS", "200"))
Image.MAX_IMAGE_PIXELS = 80_000_000  # refuse decompression bombs


@dataclass
class Item:
    """One image extracted from a document, with where it came from."""
    name: str
    image: Image.Image
    meta: dict = field(default_factory=dict)


class UnsupportedFile(ValueError):
    pass


def extract(filename: str, data: bytes) -> tuple[str, list[Item], dict]:
    """Return ``(kind, items, summary)`` for an uploaded file."""
    ext = os.path.splitext(filename)[1].lower()
    if ext in IMAGE_EXT:
        return "image", _image(filename, data), {}
    if ext in PDF_EXT:
        items, summary = _pdf(data)
        return "pdf", items, summary
    if ext in EXCEL_EXT:
        items, summary = _excel(data)
        return "excel", items, summary
    if ext in CSV_EXT:
        items, summary = _csv(filename, data)
        return "csv", items, summary
    raise UnsupportedFile(f"unsupported file type {ext or '(none)'}; expected one of {sorted(SUPPORTED)}")


def _image(filename: str, data: bytes) -> list[Item]:
    img = Image.open(io.BytesIO(data))
    items = []
    frames = getattr(img, "n_frames", 1)
    for i in range(min(frames, 20)):  # animated GIF / multi-page TIFF
        img.seek(i)
        items.append(Item(filename if frames == 1 else f"{filename} frame {i + 1}",
                          img.convert("RGB").copy(), {"size": list(img.size)}))
    return items


def _pdf(data: bytes) -> tuple[list[Item], dict]:
    import pymupdf as fitz

    doc = fitz.open(stream=data, filetype="pdf")
    items: list[Item] = []
    text_chars = 0
    embedded = 0
    for pno in range(min(doc.page_count, MAX_PDF_PAGES)):
        page = doc[pno]
        text_chars += len(page.get_text())
        pix = page.get_pixmap(dpi=72)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        items.append(Item(f"page {pno + 1}", img, {"type": "page"}))
        for xref, *_ in page.get_images(full=True):
            if len(items) >= MAX_ITEMS:
                break
            try:
                raw = doc.extract_image(xref)
                pic = Image.open(io.BytesIO(raw["image"])).convert("RGB")
            except Exception:
                continue
            if pic.width < 32 or pic.height < 32:
                continue  # skip bullets / spacer images
            embedded += 1
            items.append(Item(f"page {pno + 1} image {embedded}", pic, {"type": "embedded", "xref": xref}))
    summary = {"pages": doc.page_count, "pages_processed": min(doc.page_count, MAX_PDF_PAGES),
               "embedded_images": embedded, "text_chars": text_chars}
    doc.close()
    return items[:MAX_ITEMS], summary


def _numeric(v) -> float | None:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    return None


def render_grid(title: str, rows: list[list], max_rows: int = 60, max_cols: int = 20) -> Image.Image:
    """Draw a sheet as an image: numeric cells heat-mapped, text cells shown."""
    rows = [list(r[:max_cols]) for r in rows[:max_rows]] or [[""]]
    ncols = max(len(r) for r in rows) or 1
    cw, ch, top = 72, 18, 24
    img = Image.new("RGB", (cw * ncols + 1, ch * len(rows) + top + 1), (252, 252, 251))
    d = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    d.text((4, 5), title[:80], fill=(11, 11, 11), font=font)
    nums = [n for r in rows for n in map(_numeric, r) if n is not None]
    lo, hi = (min(nums), max(nums)) if nums else (0.0, 1.0)
    span = (hi - lo) or 1.0
    for ri, r in enumerate(rows):
        for ci in range(ncols):
            v = r[ci] if ci < len(r) else None
            x0, y0 = ci * cw, top + ri * ch
            n = _numeric(v)
            if n is not None:
                t = (n - lo) / span  # sequential blue: light (low) -> dark (high)
                fill = (int(205 - t * 192), int(226 - t * 172), int(251 - t * 144))
                ink = (255, 255, 255) if t > 0.55 else (11, 11, 11)
            else:
                fill, ink = (252, 252, 251), (82, 81, 78)
            d.rectangle([x0, y0, x0 + cw, y0 + ch], fill=fill, outline=(220, 219, 214))
            if v is not None:
                s = f"{n:.4g}" if n is not None else str(v)
                d.text((x0 + 3, y0 + 3), s[:11], fill=ink, font=font)
    return img


def _stats(rows: list[list]) -> dict:
    nums = [n for r in rows for n in map(_numeric, r) if n is not None]
    out = {"rows": len(rows), "cols": max((len(r) for r in rows), default=0), "numeric_cells": len(nums)}
    if nums:
        out.update(min=min(nums), max=max(nums), mean=round(sum(nums) / len(nums), 4), sum=round(sum(nums), 4))
    return out


def _excel(data: bytes) -> tuple[list[Item], dict]:
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)  # cached formula results
    items: list[Item] = []
    sheets = {}
    for ws in wb.worksheets:
        rows = [list(r) for r in ws.iter_rows(values_only=True)]
        while rows and all(v is None for v in rows[-1]):
            rows.pop()
        sheets[ws.title] = _stats(rows)
        items.append(Item(f"sheet '{ws.title}'", render_grid(ws.title, rows), {"type": "sheet", **sheets[ws.title]}))
        for i, pic in enumerate(getattr(ws, "_images", []), 1):  # embedded pictures
            try:
                raw = pic._data()
                items.append(Item(f"sheet '{ws.title}' picture {i}",
                                  Image.open(io.BytesIO(raw)).convert("RGB"), {"type": "embedded"}))
            except Exception:
                continue
        sheets[ws.title]["charts"] = len(getattr(ws, "_charts", []))
    return items[:MAX_ITEMS], {"sheets": sheets}


def _csv(filename: str, data: bytes) -> tuple[list[Item], dict]:
    text = data.decode("utf-8-sig", errors="replace")
    rows: list[list] = []
    for r in csv.reader(io.StringIO(text)):
        parsed = []
        for v in r:
            try:
                parsed.append(float(v))
            except ValueError:
                parsed.append(v if v else None)
        rows.append(parsed)
    s = _stats(rows)
    return [Item(filename, render_grid(filename, rows), {"type": "sheet", **s})], {"table": s}
