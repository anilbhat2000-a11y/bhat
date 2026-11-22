"""Standalone, printable HTML for an assessment report (Print -> Save as PDF)."""
from __future__ import annotations

import base64
import os
import time
from functools import lru_cache
from html import escape

APP_NAME = "3C ITS AI PC Health Checker & NPU Performance"


@lru_cache(maxsize=1)
def _logo_data_uri() -> str:
    """Embedded so the saved/printed report stays a single self-contained file."""
    path = os.path.join(os.path.dirname(__file__), "static", "3c-its-logo.png")
    try:
        with open(path, "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode()
    except OSError:
        return ""


def _v(x, unit: str = "") -> str:
    return "—" if x is None else f"{escape(str(x))}{unit}"


def _identity_line(hw: dict) -> str:
    idn = hw.get("identity") or {}
    est = idn.get("manufacture") or {}
    parts = []
    make = " ".join(x for x in (idn.get("manufacturer"), idn.get("model")) if x)
    if make:
        parts.append(escape(make))
    if idn.get("serial_number"):
        parts.append(f"S/N {escape(idn['serial_number'])}")
    if idn.get("asset_tag"):
        parts.append(f"asset {escape(idn['asset_tag'])}")
    if est.get("date"):
        parts.append(f"manufactured ≈ {escape(est['date'])} ({escape(est.get('source') or '')})")
    return f'<div class="muted">{" · ".join(parts)}</div>' if parts else ""


def render(r: dict) -> str:
    hw, m = r["hardware"], r["metrics"]
    crit_rows = []
    for c in r["criteria"]:
        pts = "not measurable" if c["points"] is None else f"{c['points']} / {c['max']}"
        width = 0 if c["points"] is None else c["points"] / c["max"] * 100
        crit_rows.append(f"<tr><td>{escape(c['title'])}</td><td class='n'>{pts}</td>"
                         f"<td class='bar'><i style='width:{width:.0f}%'></i></td></tr>")
    crit = "".join(crit_rows)
    rows = []
    b = r["benchmark"].get("baseline") or {}
    rows.append(f"<tr><td>Idle baseline</td><td class='n'>—</td><td class='n'>—</td><td class='n'>{_v(b.get('npu'), '%')}</td>"
                f"<td class='n'>{_v(b.get('cpu'), '%')}</td><td class='n'>{_v(b.get('gpu'), '%')}</td><td class='n'>{_v(b.get('power_w'), ' W')}</td></tr>")
    for x in r["benchmark"].get("results", []):
        if x.get("error"):
            rows.append(f"<tr><td>{escape(str(x.get('kind') or '').upper())} {escape(x['device'])}</td><td colspan='6'>failed: {escape(x['error'][:200])}</td></tr>")
            continue
        d = x["during"]
        rows.append(f"<tr><td><b>{escape(x['kind'].upper())}</b> {escape(x['label'])}</td><td class='n'>{x['ips']}</td>"
                    f"<td class='n'>{x['latency_mean_ms']} / {x['latency_p95_ms']} ms</td><td class='n'>{_v(d.get('npu'), '%')}</td>"
                    f"<td class='n'>{_v(d.get('cpu'), '%')}</td><td class='n'>{_v(d.get('gpu'), '%')}</td><td class='n'>{_v(d.get('power_w'), ' W')}</td></tr>")
    li = lambda xs: "".join(f"<li>{escape(x)}</li>" for x in xs) or "<li>—</li>"
    wl = "".join(f"<tr><td>{escape(w['workload'])}</td><td><b>{escape(str(w['kind'] or '').upper())}</b> {escape(w['device'] or '—')}</td><td>{escape(w['why'])}</td></tr>"
                 for w in r["workloads"])
    rated = hw.get("rated_npu") or {}
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI PC Health &amp; NPU Report</title>
<style>
:root{{--ink:#0a2a22;--muted:#3f5f56;--line:#cfe1da;--accent:#04735f;--teal:#008a6c;--good:#0a7d32;--bad:#c03030;--bg:#ffffff}}
body{{font:14px/1.5 "Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,Roboto,sans-serif;color:var(--ink);background:var(--bg);max-width:960px;margin:0 auto;padding:0 16px 24px}}
h1,h2,.score,.verdict{{font-family:"Bahnschrift","DIN Alternate","Segoe UI",system-ui,sans-serif}}
h1{{font-size:24px;margin:0;color:var(--accent)}} h2{{font-size:16px;margin:26px 0 8px;color:var(--accent);border-left:4px solid var(--teal);padding-left:8px}} .muted{{color:var(--muted)}}
.band{{height:8px;margin:0 -16px 18px;background:repeating-linear-gradient(-18deg,rgba(255,255,255,.18) 0 2px,transparent 2px 12px),linear-gradient(100deg,#04735f,#0a3d32);-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.hero{{display:flex;gap:24px;align-items:center;flex-wrap:wrap;border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:14px;background:#f3f8f6}}
.score{{font-size:56px;font-weight:700;line-height:1;color:var(--accent)}} .score small{{font-size:18px;color:var(--muted)}}
.verdict{{font-size:18px;font-weight:600}}
table{{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}} td,th{{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{color:var(--muted);font-weight:500;font-size:12px}} .n{{text-align:right;white-space:nowrap}}
.bar{{width:35%}} .bar i{{display:block;height:8px;background:var(--teal);border-radius:0 4px 4px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.pros li::marker{{content:"✔  ";color:var(--good)}} .cons li::marker{{content:"✖  ";color:var(--bad)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 24px}}
.scroll{{overflow-x:auto}}
.brand{{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:1px solid var(--line);margin-bottom:12px}}
.brand img{{height:52px;width:auto}} .brand .app{{font-size:13px;color:var(--muted)}} @media print{{body{{padding:0}} .noprint{{display:none}}}}
</style></head><body>
<div class="band"></div>
<div class="brand"><img src="{_logo_data_uri()}" alt="3C ITS – Make IT Simple"><div class="app">{escape(APP_NAME)}</div></div>
<h1>NPU Suitability Report</h1>
<div class="muted">{escape(hw.get('host') or '')} · {escape(time.strftime('%Y-%m-%d %H:%M', time.localtime(r['created'])))} · model: {escape(r['model'])}</div>
<div class="hero"><div class="score">{r['score']}<small>/100</small></div>
<div><div class="verdict">{escape(r['verdict'])}</div>
<div class="muted">{escape(hw.get('cpu') or '')} · {escape(hw.get('machine_type') or '')} · {hw.get('cores_logical')} threads · {hw.get('ram_gb')} GB RAM</div>
<div class="muted">NPU: {escape(', '.join(hw.get('npu_names') or []) or (rated.get('family') or 'none detected'))}{f" · {rated['tops']} TOPS (vendor rating)" if rated.get('tops') else ''}</div>{_identity_line(hw)}</div></div>
<h2>Why: strengths and weaknesses</h2>
<div class="grid"><ul class="pros">{li(r['pros'])}</ul><ul class="cons">{li(r['cons'])}</ul></div>
<h2>Score breakdown</h2><table>{crit}</table>
<h2>Best processor for each workload</h2><div class="scroll"><table><tr><th>Workload</th><th>Use</th><th>Because</th></tr>{wl}</table></div>
<h2>Measurements (same model, {r['benchmark'].get('seconds')} s per device)</h2>
<div class="scroll"><table><tr><th>Device</th><th class="n">Inf/s</th><th class="n">Latency mean / p95</th><th class="n">NPU</th><th class="n">CPU</th><th class="n">GPU</th><th class="n">Power</th></tr>{''.join(rows)}</table></div>
<p class="muted">Power source: {escape(m.get('power_source') or 'not available (plug-in AC power hides battery draw)')}.</p>
<h2>Recommendations</h2><ul>{li(r['recommendations'])}</ul>
<p class="muted noprint">Tip: use your browser's Print → Save as PDF to keep this report.</p>
</body></html>"""
