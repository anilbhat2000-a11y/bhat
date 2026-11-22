"""Standalone, printable HTML for an assessment report (Print -> Save as PDF)."""
from __future__ import annotations

import time
from html import escape


def _v(x, unit: str = "") -> str:
    return "—" if x is None else f"{escape(str(x))}{unit}"


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
<title>NPU Suitability Report</title>
<style>
:root{{--ink:#0b0b0b;--muted:#52514e;--line:#e0dfda;--accent:#2a78d6;--good:#0a7d32;--bad:#c03030;--bg:#fcfcfb}}
body{{font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);max-width:960px;margin:0 auto;padding:24px 16px}}
h1{{font-size:22px;margin:0}} h2{{font-size:16px;margin:26px 0 8px}} .muted{{color:var(--muted)}}
.hero{{display:flex;gap:24px;align-items:center;flex-wrap:wrap;border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:14px}}
.score{{font-size:56px;font-weight:700;line-height:1}} .score small{{font-size:18px;color:var(--muted)}}
.verdict{{font-size:18px;font-weight:600}}
table{{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}} td,th{{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{color:var(--muted);font-weight:500;font-size:12px}} .n{{text-align:right;white-space:nowrap}}
.bar{{width:35%}} .bar i{{display:block;height:8px;background:var(--accent);border-radius:0 4px 4px 0}}
.pros li::marker{{content:"✔  ";color:var(--good)}} .cons li::marker{{content:"✖  ";color:var(--bad)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 24px}}
.scroll{{overflow-x:auto}} @media print{{body{{padding:0}} .noprint{{display:none}}}}
</style></head><body>
<h1>NPU Suitability Report</h1>
<div class="muted">{escape(hw.get('host') or '')} · {escape(time.strftime('%Y-%m-%d %H:%M', time.localtime(r['created'])))} · model: {escape(r['model'])}</div>
<div class="hero"><div class="score">{r['score']}<small>/100</small></div>
<div><div class="verdict">{escape(r['verdict'])}</div>
<div class="muted">{escape(hw.get('cpu') or '')} · {escape(hw.get('machine_type') or '')} · {hw.get('cores_logical')} threads · {hw.get('ram_gb')} GB RAM</div>
<div class="muted">NPU: {escape(', '.join(hw.get('npu_names') or []) or (rated.get('family') or 'none detected'))}{f" · {rated['tops']} TOPS (vendor rating)" if rated.get('tops') else ''}</div></div></div>
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
