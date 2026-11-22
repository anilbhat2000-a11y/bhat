/* 3C ITS AI PC Health Checker & NPU Performance - dashboard. No external dependencies, works fully offline. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (v) => (v == null ? "—" : `${Number(v).toFixed(1)}%`);
  const num = (v, d = 1) => (v == null ? "—" : Number(v).toFixed(d));
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const gpuMax = (s) => s.gpu.reduce((m, g) => Math.max(m, g.util), 0);

  let history = [];
  let spanSec = 120;
  let devices = [];
  let hoverX = null;

  // ---------- settings & user ----------
  $("settingsBtn").onclick = () => UISettings.open();
  window.addEventListener("ui-settings-changed", () => { draw(); drawPower(); });
  const fsScale = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--fs-scale")) || 1;
  const chartFont = (px) => `${Math.round(px * fsScale())}px ${getComputedStyle(document.body).fontFamily}`;
  UISettings.mountUser($("userSlot"));

  // ---------- API ----------
  async function api(path, opts = {}) {
    const r = await fetch(path, opts);
    if (r.status === 401) { location.href = "/login"; throw new Error("signed out"); }
    const body = r.headers.get("content-type")?.includes("json") ? await r.json() : await r.text();
    if (!r.ok) throw new Error(body?.detail || body || r.statusText);
    return body;
  }
  const postJSON = (path, data) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

  // ---------- system info ----------
  async function loadSystem() {
    const s = await api("/api/system");
    $("host").textContent = `${s.host} · ${s.os} · ${s.cpu} · model: ${s.inference.model.name}`;
    const src = s.telemetry.npu_source;
    const badge = $("npuSource");
    badge.textContent = src.startsWith("hardware") ? "NPU: hardware counter" : "NPU: in-app estimate";
    badge.className = "badge " + (src.startsWith("hardware") ? "ok" : "est");
    badge.title = src.startsWith("hardware")
      ? `Reading ${src.split(":")[1]} - includes NPU load from every process.`
      : "No NPU hardware counter readable on this OS/driver. Showing the share of time this app kept the NPU busy.";
    const ai = s.hardware.ai_pc;
    $("aiPc").textContent = ai.class;
    $("aiPc").title = ai.reason;
    $("aiPc").className = "badge " + (ai.class === "Copilot+ AI PC" ? "ok" : ai.is_ai_pc ? "" : "bad");
    devices = s.inference.devices;
    const opts = devices.length
      ? devices.map((d) => `<option value="${esc(d.id)}">${esc(d.kind.toUpperCase())} · ${esc(d.label)}</option>`).join("")
      : `<option value="">No inference backend installed</option>`;
    document.querySelectorAll(".devSel").forEach((sel) => { sel.innerHTML = opts; });
    if (!devices.some((d) => d.kind === "npu")) {
      $("foot").textContent = "No NPU backend found - install OpenVINO (Intel), Ryzen AI Software (AMD) or onnxruntime-qnn (Snapdragon). GPU/CPU still work for comparison.";
    } else {
      $("foot").textContent = `Telemetry every ${s.telemetry.interval_s}s · GPU sources: ${s.telemetry.gpu_sources.join(", ") || "none"}`;
    }
    $("benchDevs").innerHTML = devices.map((d, i) =>
      `<label><input type="checkbox" value="${esc(d.id)}" ${i < 4 ? "checked" : ""}> ${esc(d.kind.toUpperCase())} <span class="muted small">${esc(d.id)}</span></label>`).join("");
    if (s.inference.model.builtin) {
      $("fileStats").innerHTML = `<span class="muted">Using the built-in workload CNN (no labels). Run <code>python scripts/download_models.py</code> once for MobileNetV2 ImageNet labels.</span>`;
    }
  }

  // ---------- live telemetry ----------
  function connect() {
    const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/metrics`);
    ws.onopen = () => { $("conn").textContent = "live"; $("conn").className = "badge ok"; };
    ws.onclose = () => { $("conn").textContent = "reconnecting"; $("conn").className = "badge est"; setTimeout(connect, 1500); };
    ws.onmessage = (ev) => {
      const { sample, live } = JSON.parse(ev.data);
      history.push(sample);
      const cutoff = sample.ts - 900;
      while (history.length && history[0].ts < cutoff) history.shift();
      updateKpis(sample);
      updateLive(live);
      draw(); drawPower();
    };
  }

  function updateKpis(s) {
    $("kNpu").textContent = pct(s.npu.util);
    $("kNpuFoot").textContent = `this app ${pct(s.npu.app_util)}${s.npu.mem_mb != null ? ` · ${s.npu.mem_mb} MB` : ""}`;
    $("kCpu").textContent = pct(s.cpu.util);
    $("kCpuFoot").textContent = `this app ${pct(s.cpu.app_util)}${s.cpu.freq_mhz ? ` · ${s.cpu.freq_mhz} MHz` : ""}`;
    const g = s.gpu.length ? s.gpu.reduce((a, b) => (b.util > a.util ? b : a)) : null;
    $("kGpu").textContent = g ? pct(g.util) : "n/a";
    $("kGpuFoot").textContent = g ? `${g.name}` : "no GPU counter on this system";
    const kinds = Object.entries(s.inference);
    const ips = kinds.reduce((a, [, v]) => a + v.ips, 0);
    $("kIps").textContent = num(ips);
    $("kIpsFoot").textContent = kinds.length ? kinds.map(([k, v]) => `${k.toUpperCase()} ${v.latency_ms} ms`).join(" · ") : "idle";
    $("kMem").textContent = pct(s.cpu.mem_used_pct);
    $("kMemFoot").textContent = `${s.cpu.mem_used_gb}/${s.cpu.mem_total_gb} GB${s.cpu.power_w != null ? ` · ${s.cpu.power_source?.startsWith("battery") ? "system" : "CPU pkg"} ${s.cpu.power_w} W` : ""}`;
    $("cores").innerHTML = s.cpu.per_core.map((c, i) => `<i title="core ${i}: ${c}%"><b style="height:${c}%"></b></i>`).join("");
  }

  // ---------- chart ----------
  const canvas = $("chart");
  const ctx = canvas.getContext("2d");
  const PAD = { l: 44, r: 10, t: 8, b: 24 };

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const now = history.length ? history[history.length - 1].ts : Date.now() / 1000;
    const t0 = now - spanSec;
    const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
    const x = (t) => PAD.l + ((t - t0) / spanSec) * pw;
    const y = (v) => PAD.t + ph - (Math.min(100, Math.max(0, v)) / 100) * ph;
    const pts = history.filter((s) => s.ts >= t0);

    // NPU-busy bands
    ctx.fillStyle = css("--band");
    let bandStart = null;
    pts.forEach((s, i) => {
      const busy = s.phase === "npu_active";
      if (busy && bandStart == null) bandStart = s.ts;
      if ((!busy || i === pts.length - 1) && bandStart != null) {
        ctx.fillRect(x(bandStart), PAD.t, Math.max(2, x(s.ts) - x(bandStart)), ph);
        bandStart = null;
      }
    });

    // grid + axes (recessive)
    ctx.strokeStyle = css("--grid"); ctx.lineWidth = 1;
    ctx.fillStyle = css("--text-muted"); ctx.font = chartFont(11);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let v = 0; v <= 100; v += 25) {
      ctx.beginPath(); ctx.moveTo(PAD.l, y(v) + 0.5); ctx.lineTo(W - PAD.r, y(v) + 0.5); ctx.stroke();
      ctx.fillText(`${v}%`, PAD.l - 6, y(v));
    }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const step = spanSec <= 120 ? 30 : spanSec <= 300 ? 60 : 180;
    for (let s = 0; s <= spanSec; s += step) ctx.fillText(s === 0 ? "now" : `-${s >= 60 ? `${s / 60}m` : `${s}s`}`, x(now - s), H - PAD.b + 6);

    const series = [["--cpu", (s) => s.cpu.util], ["--gpu", gpuMax], ["--npu", (s) => s.npu.util]];
    ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (const [color, f] of series) {
      ctx.strokeStyle = css(color); ctx.beginPath();
      pts.forEach((s, i) => (i ? ctx.lineTo(x(s.ts), y(f(s))) : ctx.moveTo(x(s.ts), y(f(s)))));
      ctx.stroke();
    }

    // hover crosshair + tooltip
    const tip = $("tip");
    if (hoverX == null || !pts.length) { tip.hidden = true; return; }
    const tHover = t0 + ((hoverX - PAD.l) / pw) * spanSec;
    const s = pts.reduce((a, b) => (Math.abs(b.ts - tHover) < Math.abs(a.ts - tHover) ? b : a));
    const sx = x(s.ts);
    ctx.strokeStyle = css("--text-muted"); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx + 0.5, PAD.t); ctx.lineTo(sx + 0.5, PAD.t + ph); ctx.stroke();
    for (const [color, f] of series) {
      ctx.fillStyle = css(color); ctx.strokeStyle = css("--surface-1"); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, y(f(s)), 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const work = Object.entries(s.workloads).map(([k, v]) => `${k} → ${v}`).join(", ");
    tip.innerHTML = `<strong>${new Date(s.ts * 1000).toLocaleTimeString()}</strong>
      <div><i class="sw s-npu"></i>NPU ${pct(s.npu.util)}</div>
      <div><i class="sw s-cpu"></i>CPU ${pct(s.cpu.util)} (app ${pct(s.cpu.app_util)})</div>
      <div><i class="sw s-gpu"></i>GPU ${s.gpu.length ? pct(gpuMax(s)) : "n/a"}</div>
      ${work ? `<div class="muted">${esc(work)}</div>` : ""}`;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = `${sx + 12 + tw > W ? sx - tw - 12 : sx + 12}px`;
    tip.style.top = `${PAD.t + 4}px`;
  }
  canvas.addEventListener("mousemove", (e) => { hoverX = e.offsetX; draw(); });
  canvas.addEventListener("mouseleave", () => { hoverX = null; draw(); });
  new ResizeObserver(draw).observe(canvas);
  document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".seg button").forEach((o) => o.classList.toggle("on", o === b));
    spanSec = Number(b.dataset.span);
    $("spanLabel").textContent = b.textContent.replace("m", " min");
    document.querySelectorAll(".spanTxt").forEach((el) => { el.textContent = $("spanLabel").textContent; });
    draw(); drawPower();
  }));

  // ---------- impact ----------
  async function refreshImpact() {
    try {
      const r = await api(`/api/impact?seconds=${$("impactSpan").value}`);
      const rows = [["NPU utilisation", "npu", "%"], ["CPU (system)", "cpu", "%"], ["CPU (this app)", "app_cpu", "%"],
        ["GPU", "gpu", "%"], ["Memory used", "mem_pct", "%"], ["CPU package power", "power_w", " W"]];
      $("impactTbl").tBodies[0].innerHTML = rows.map(([label, k, u]) => {
        const i = r.idle?.[k], a = r.npu_active?.[k], d = r.delta?.[k];
        const cls = d == null || k === "npu" ? "" : d > 0.5 ? "up" : d < -0.5 ? "down" : "";
        const fmt = (v) => (v == null ? "—" : `${num(v)}${u}`);
        return `<tr><td>${label}</td><td>${fmt(i)}</td><td>${fmt(a)}</td><td class="${cls}">${d == null ? "—" : `${d > 0 ? "+" : ""}${num(d)}${u}`}</td></tr>`;
      }).join("");
      const c = r.correlation;
      const corr = (v) => (v == null ? "n/a" : v.toFixed(2));
      $("impactNote").innerHTML = !r.npu_active
        ? `<span class="muted">No NPU activity in this window yet - start the camera or process a document on the NPU.</span>`
        : !r.idle
          ? `<span class="muted">No idle samples in this window - stop all workloads for ~10 s to capture a baseline.</span>`
          : `Correlation with NPU load: CPU r = ${corr(c.npu_cpu)}, GPU r = ${corr(c.npu_gpu)}. `
            + `${r.idle.samples} idle vs ${r.npu_active.samples} busy samples. CPU cost of feeding the NPU (decode, resize, pre/post-processing) shows up as the "this app" Δ.`;
    } catch (e) { $("impactNote").textContent = e.message; }
  }
  $("impactSpan").onchange = refreshImpact;
  setInterval(refreshImpact, 3000);

  // ---------- live camera / screen ----------
  let liveRunning = false, browserStream = null;
  $("liveMode").onchange = () => { $("camIdxWrap").hidden = $("liveMode").value !== "camera"; };

  function updateLive(live) {
    if ($("liveMode").value === "browser") return;
    if (live.running) {
      const last = live.last;
      $("liveStatus").textContent = `${live.source} · ${live.device} · ${live.fps} FPS · ${live.frames} frames`
        + (last ? ` · top: ${last.top[0].label} (${(last.top[0].score * 100).toFixed(1)}%) in ${last.latency_ms} ms` : "");
    } else if (liveRunning) {
      setLiveUi(false);
      if (live.error) $("liveStatus").innerHTML = `<span class="err">${esc(live.error)}</span>`;
    }
  }

  function setLiveUi(on) {
    liveRunning = on;
    $("liveBtn").textContent = I18N.t(on ? "Stop" : "Start");
    $("liveBtn").classList.toggle("stop", on);
    if (!on) {
      $("liveImg").hidden = true; $("liveImg").removeAttribute("src");
      $("liveVideo").hidden = true; $("liveEmpty").hidden = false;
    }
  }

  async function browserLoop(device) {
    const v = $("liveVideo");
    const c = document.createElement("canvas");
    let frames = 0, t = performance.now();
    while (liveRunning && browserStream) {
      if (v.videoWidth) {
        c.width = Math.min(960, v.videoWidth);
        c.height = Math.round(c.width * v.videoHeight / v.videoWidth);
        c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
        const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.8));
        try {
          const r = await api(`/api/frame?device=${encodeURIComponent(device)}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
          frames++;
          const fps = frames / ((performance.now() - t) / 1000);
          $("liveStatus").textContent = `browser camera · ${r.device} · ${fps.toFixed(1)} FPS · top: ${r.top[0].label} (${(r.top[0].score * 100).toFixed(1)}%) in ${r.latency_ms} ms`;
        } catch (e) { $("liveStatus").innerHTML = `<span class="err">${esc(e.message)}</span>`; break; }
      } else {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  $("liveBtn").onclick = async () => {
    const mode = $("liveMode").value, device = $("liveDev").value;
    if (liveRunning) {
      if (browserStream) { browserStream.getTracks().forEach((t) => t.stop()); browserStream = null; }
      else await postJSON("/api/live/stop", {}).catch(() => {});
      setLiveUi(false); $("liveStatus").textContent = "Stopped.";
      return;
    }
    $("liveBtn").disabled = true;
    $("liveStatus").textContent = "Compiling model for the device (first run can take a few seconds)…";
    try {
      if (mode === "browser") {
        browserStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        const v = $("liveVideo"); v.srcObject = browserStream; await v.play();
        v.hidden = false; $("liveEmpty").hidden = true; setLiveUi(true);
        browserLoop(device);
      } else {
        await postJSON("/api/live/start", { mode, device, camera_index: Number($("camIdx").value) });
        $("liveImg").src = `/api/live/stream?t=${Date.now()}`;
        $("liveImg").hidden = false; $("liveEmpty").hidden = true; setLiveUi(true);
      }
    } catch (e) {
      $("liveStatus").innerHTML = `<span class="err">${esc(e.message)}</span>`;
      setLiveUi(false);
    } finally { $("liveBtn").disabled = false; }
  };

  // ---------- documents ----------
  let pending = [];
  const drop = $("drop");
  function setFiles(list) {
    pending = [...list];
    $("fileList").textContent = pending.map((f) => `${f.name} (${(f.size / 1024).toFixed(0)} KB)`).join(" · ");
    $("fileBtn").disabled = !pending.length;
  }
  $("fileIn").onchange = (e) => setFiles(e.target.files);
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => setFiles(e.dataTransfer.files));
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("fileIn").click(); } });

  async function poll(id, onUpdate) {
    for (;;) {
      const j = await api(`/api/jobs/${id}`);
      onUpdate(j);
      if (j.status === "done" || j.status === "error") return j;
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  $("fileBtn").onclick = async () => {
    const fd = new FormData();
    pending.forEach((f) => fd.append("files", f));
    fd.append("device", $("fileDev").value);
    fd.append("repeat", $("repeat").value);
    $("fileBtn").disabled = true; $("fileProg").hidden = false; $("fileProg").value = 0;
    $("results").innerHTML = ""; $("fileStats").textContent = "Uploading…";
    try {
      const { id } = await api("/api/files", { method: "POST", body: fd });
      const j = await poll(id, (j) => {
        $("fileProg").value = j.progress;
        $("fileStats").textContent = `${j.status} · ${Math.round(j.progress * 100)}% · ${j.items.length} items classified`;
      });
      renderFiles(j);
    } catch (e) {
      $("fileStats").innerHTML = `<span class="err">${esc(e.message)}</span>`;
    } finally { $("fileBtn").disabled = !pending.length; $("fileProg").hidden = true; }
  };

  function renderFiles(j) {
    const files = j.files.map((f) => f.error
      ? `<div class="err">${esc(f.name)}: ${esc(f.error)}</div>`
      : `<div><strong>${esc(f.name)}</strong> · ${esc(f.kind)} · ${f.items} item(s) ${summaryText(f)}</div>`).join("");
    if (j.status === "error") { $("fileStats").innerHTML = files + `<div class="err">${esc(j.error)}</div>`; return; }
    const s = j.stats, d = s.during;
    $("fileStats").innerHTML = files + `<p><strong>${s.inferences}</strong> inferences on <strong>${esc(j.device)}</strong> in ${s.seconds}s
      → ${s.ips}/s, latency ${s.latency_mean_ms} ms (p95 ${s.latency_p95_ms} ms).
      During the job: NPU ${pct(d.npu)}, CPU ${pct(d.cpu)} (this app ${pct(d.app_cpu)}), GPU ${pct(d.gpu)}${d.power_w != null ? `, ${d.power_w} W` : ""}.</p>`;
    $("results").innerHTML = j.items.map((it) => `<div class="res"><img src="${it.thumb}" alt="">
      <div class="b"><div class="n" title="${esc(it.file)} - ${esc(it.name)}">${esc(it.name)}</div>
      <div class="l">${esc(it.top[0].label)} <span class="muted">${(it.top[0].score * 100).toFixed(1)}%</span></div>
      <div class="muted">${it.latency_ms} ms · ${esc(it.kind.toUpperCase())}</div></div></div>`).join("");
    refreshImpact();
  }
  function summaryText(f) {
    const s = f.summary || {};
    if (f.kind === "pdf") return `· ${s.pages} pages, ${s.embedded_images} embedded images, ${s.text_chars} text chars`;
    if (f.kind === "excel") return "· " + Object.entries(s.sheets).map(([n, v]) =>
      `${esc(n)}: ${v.rows}×${v.cols}, ${v.numeric_cells} numbers${v.mean != null ? ` (mean ${v.mean})` : ""}, ${v.charts} charts`).join("; ");
    if (f.kind === "csv") return `· ${s.table.rows}×${s.table.cols}, ${s.table.numeric_cells} numbers`;
    return "";
  }

  // ---------- benchmark ----------
  $("benchBtn").onclick = async () => {
    const devs = [...document.querySelectorAll("#benchDevs input:checked")].map((i) => i.value);
    if (!devs.length) return;
    $("benchBtn").disabled = true; $("benchProg").hidden = false; $("benchTbl").hidden = false;
    try {
      const { id } = await postJSON("/api/benchmark", { devices: devs, seconds: Number($("benchSecs").value) });
      const j = await poll(id, (j) => { $("benchProg").value = j.progress; renderBench(j); });
      renderBench(j);
    } catch (e) { alert(e.message); } finally { $("benchBtn").disabled = false; $("benchProg").hidden = true; }
  };
  function bar(v, color) {
    if (v == null) return "—";
    return `<span class="bar">${pct(v)}<i style="width:${Math.max(1, v * 0.6)}px;background:var(${color})"></i></span>`;
  }
  function renderBench(j) {
    const rows = [];
    if (j.baseline) {
      const b = j.baseline;
      rows.push(`<tr><td><strong>Idle baseline</strong></td><td>—</td><td>—</td><td>${bar(b.npu, "--npu")}</td><td>${bar(b.cpu, "--cpu")}</td><td>${bar(b.app_cpu, "--cpu")}</td><td>${bar(b.gpu, "--gpu")}</td><td>${b.power_w != null ? `${b.power_w} W` : "—"}</td></tr>`);
    }
    for (const r of j.results) {
      if (r.error) { rows.push(`<tr><td>${esc(r.device)}</td><td colspan="7" class="err" style="text-align:left">${esc(r.error)}</td></tr>`); continue; }
      if (!r.during) { rows.push(`<tr><td>${esc(r.device)}</td><td colspan="7" class="muted" style="text-align:left">running…</td></tr>`); continue; }
      const d = r.during;
      rows.push(`<tr><td><strong>${esc((r.kind || "").toUpperCase())}</strong> <span class="muted small">${esc(r.label)}</span></td>
        <td>${r.ips}</td><td>${r.latency_mean_ms} / ${r.latency_p95_ms} ms</td>
        <td>${bar(d.npu, "--npu")}</td><td>${bar(d.cpu, "--cpu")}</td><td>${bar(d.app_cpu, "--cpu")}</td><td>${bar(d.gpu, "--gpu")}</td>
        <td>${d.power_w != null ? `${d.power_w} W` : "—"}</td></tr>`);
    }
    $("benchTbl").tBodies[0].innerHTML = rows.join("");
  }


  // ---------- NPU suitability assessment ----------
  function renderAssessment(r) {
    $("assessOut").hidden = false;
    $("aScore").textContent = r.score;
    $("aVerdict").textContent = r.verdict;
    const hw = r.hardware, rated = hw.rated_npu || {};
    $("aHw").textContent = `${hw.host} · ${hw.machine_type} · ${hw.cpu} · ${hw.cores_logical} threads · ${hw.ram_gb} GB RAM · NPU: `
      + ((hw.npu_names || []).join(", ") || rated.family || "none detected") + (rated.tops ? ` (${rated.tops} TOPS rated)` : "");
    const li = (xs) => xs.length ? xs.map((x) => `<li>${esc(x)}</li>`).join("") : `<li class="muted" style="list-style:none">None found</li>`;
    $("aPros").innerHTML = li(r.pros);
    $("aCons").innerHTML = li(r.cons);
    $("aRecs").innerHTML = li(r.recommendations);
    $("aCrit").tBodies[0].innerHTML = r.criteria.map((c) => `<tr><td>${esc(c.title)}</td>
      <td>${c.points == null ? '<span class="muted">not measurable</span>' : `${c.points} / ${c.max}`}</td>
      <td class="critbar"><i style="width:${c.points == null ? 0 : (c.points / c.max) * 100}%"></i></td></tr>`).join("");
    $("aWl").tBodies[0].innerHTML = r.workloads.map((w) => `<tr><td>${esc(w.workload)}</td>
      <td><strong>${esc((w.kind || "").toUpperCase())}</strong> <span class="muted">${esc(w.device || "—")}</span><br><span class="small">${esc(w.why)}</span></td></tr>`).join("");
    if (r.file) {
      $("aHtml").href = `/api/reports/${encodeURIComponent(r.file)}/html`;
      $("aJson").href = `/api/reports/${encodeURIComponent(r.file)}`;
      $("aJson").download = r.file;
    }
  }

  $("assessBtn").onclick = async () => {
    $("assessBtn").disabled = true; $("assessProg").hidden = false; $("assessProg").value = 0;
    $("assessIntro").textContent = "Measuring the idle baseline, then each processor in turn… keep the machine idle.";
    try {
      const { id } = await postJSON("/api/assessment", { seconds: Number($("assessSecs").value) });
      const j = await poll(id, (j) => { $("assessProg").value = j.progress; });
      if (j.status === "error") throw new Error(j.error);
      renderAssessment(j.report);
      $("assessIntro").textContent = "Assessment complete. The report is saved and can be compared with other machines below.";
      loadSaved();
    } catch (e) {
      $("assessIntro").innerHTML = `<span class="err">${esc(e.message)}</span>`;
    } finally { $("assessBtn").disabled = false; $("assessProg").hidden = true; }
  };

  let imported = [];
  async function loadSaved() {
    try {
      const list = await api("/api/reports");
      $("savedReports").innerHTML = list.length
        ? list.slice(0, 12).map((r, i) => `<label><input type="checkbox" value="${esc(r.file)}" ${i < 1 ? "checked" : ""}>
            ${esc(r.host)} <span class="muted small">${r.score}/100 · ${new Date(r.created * 1000).toLocaleString()}</span></label>`).join("")
        : `<span class="muted small">No saved reports yet. Run the assessment first.</span>`;
      if (list.length) {
        const latest = await api(`/api/reports/${encodeURIComponent(list[0].file)}`);
        if ($("assessOut").hidden) renderAssessment(latest);
      }
    } catch { /* server not ready */ }
  }

  $("importIn").onchange = async (e) => {
    for (const f of e.target.files) {
      try {
        const r = JSON.parse(await f.text());
        if (!r.hardware || r.score == null) throw new Error("not a 3C ITS AI PC Health Checker report");
        imported.push(r);
      } catch (err) { alert(`${f.name}: ${err.message}`); }
    }
    $("imported").textContent = imported.length ? `Imported: ${imported.map((r) => `${r.hardware.host} (${r.score}/100)`).join(", ")}` : "";
    e.target.value = "";
  };

  $("compareBtn").onclick = async () => {
    const files = [...document.querySelectorAll("#savedReports input:checked")].map((i) => i.value);
    try {
      const saved = await Promise.all(files.map((f) => api(`/api/reports/${encodeURIComponent(f)}`)));
      const all = [...saved, ...imported];
      if (!all.length) { alert("Select or import at least one report."); return; }
      renderCompare(await postJSON("/api/compare", all), "rankTbl", "whyBest", "caveats");
      $("compareOut").hidden = false;
    } catch (e) { alert(e.message); }
  };


  function renderCompare(c, tbl, why, cav) {
    $(tbl).tBodies[0].innerHTML = c.ranking.map((r) => `<tr class="${r.rank === 1 ? "best" : ""}">
      <td>${r.rank}</td><td>${esc(r.host)} <span class="muted small">${esc(r.cpu)} · ${esc(r.machine_type)}</span></td>
      <td>${r.score}</td><td>${num(r.npu_ips)}</td><td>${num(r.npu_fps)}</td><td>${r.speedup_vs_cpu == null ? "—" : `${r.speedup_vs_cpu}×`}</td>
      <td>${pct(r.cpu_busy_on_npu)}</td><td>${num(r.npu_inf_per_joule, 2)}</td><td>${r.rated_tops ?? "—"}</td></tr>`).join("");
    $(why).innerHTML = c.why_best.map((x) => `<li>${esc(x)}</li>`).join("");
    $(cav).innerHTML = [...(c.warnings || []), ...(c.caveats || [])].map((x) => `<li>${esc(x)}</li>`).join("");
  }

  // ---------- alerts ----------
  async function refreshAlerts() {
    try {
      const a = await api("/api/alerts");
      $("alerts").innerHTML = a.active.map((x) => `<div class="alert ${x.level}"><span class="lvl">${esc(x.level)}</span>
        <div><div class="t">${esc(x.title)}</div><div class="d">${esc(x.detail)}</div></div></div>`).join("");
    } catch { /* ignore */ }
  }
  setInterval(refreshAlerts, 5000);

  // ---------- battery & predictions ----------
  const mins = (m) => (m == null ? "—" : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);
  async function refreshBattery() {
    let v;
    try { v = await api("/api/battery"); } catch { return; }
    const b = v.battery, rt = v.runtime, f = v.forecast;
    $("batNone").hidden = !!b.present;
    $("batStatus").textContent = b.present ? b.status : "no battery";
    $("bCharge").textContent = b.present ? pct(b.percent) : "—";
    $("bChargeFoot").textContent = b.present ? `${b.now_wh ?? "?"} / ${b.full_wh ?? "?"} Wh${b.plugged ? " · plugged in" : " · on battery"}` : "";
    const last = history[history.length - 1];
    const pw = b.present && b.power_w != null ? b.power_w : last?.cpu.power_w;
    $("bPower").textContent = pw == null ? "—" : `${Math.abs(pw).toFixed(1)} W`;
    $("bPowerFoot").textContent = pw == null ? "plug out the charger to measure" : (b.present && b.power_w < 0 ? "charging" : (last?.cpu.power_source || "battery discharge"));
    $("bHealth").textContent = b.health_pct == null ? "—" : `${b.health_pct}%`;
    $("bHealthFoot").textContent = b.present ? `${b.cycles != null ? `${b.cycles} cycles · ` : ""}design ${b.design_wh ?? "?"} Wh` : "";
    $("bLeft").textContent = rt.available ? (b.plugged ? mins(rt.full_by_trend_min ?? rt.full_by_power_min) : mins(rt.empty_min)) : "—";
    $("bLeftFoot").textContent = !rt.available ? "" : b.plugged ? "until full" : rt.empty_by_trend_min ? "from discharge trend" : rt.empty_by_power_min ? "from current draw" : "collecting data…";

    const p = [];
    if (b.present) {
      if (rt.trend_pct_per_hour != null) p.push(`Charge is changing at ${rt.trend_pct_per_hour}% per hour (last 10 min).`);
      if (!b.plugged && rt.empty_by_power_min) p.push(`At the current ${b.power_w} W draw the battery empties in ${mins(rt.empty_by_power_min)}.`);
      if (f.available) {
        p.push(`Battery condition: ${f.condition} (${f.health_pct}% of design capacity${f.cycles ? `, ${f.cycles} cycles` : ""}).`);
        p.push(f.days_to_80 > 0
          ? `Predicted to reach 80% health around ${f.date_80} (~${(f.days_to_80 / 365).toFixed(1)} years). Method: ${f.method}; ${f.cycles_per_day} cycles/day (${f.cycles_per_day_source}). Wear ≈ ${f.wear_pct_per_year}%/year.`
          : `Battery is already at or below 80% health. Plan a replacement.`);
      } else p.push(esc(f.reason || "Battery health not reported."));
    } else {
      p.push("No battery: battery predictions don't apply. Power and thermal data are shown where available.");
    }
    const t = Object.entries(v.temps || {});
    if (t.length) p.push(`Temperatures: ${t.map(([k, c]) => `${k} ${c} °C`).join(", ")}.`);
    if (v.lifespan) p.push(v.lifespan.text);
    $("predList").innerHTML = p.map((x) => `<li>${esc(x)}</li>`).join("");

    const m = v.impact_model;
    if (!m.available) {
      $("imIntro").textContent = `${m.reason}. The model then shows how a 30 FPS AI camera loads each processor.`;
      $("imTbl").tBodies[0].innerHTML = ""; $("imFindings").innerHTML = ""; $("imLifespan").textContent = "";
      return;
    }
    $("imIntro").textContent = `A ${m.rate} inferences/s AI workload (30 FPS camera) modelled on each processor from the latest assessment. ` +
      (m.power_measured ? `Power: ${m.power_source}.` : "Power not measured.");
    $("imTbl").tBodies[0].innerHTML = m.rows.map((r) => `<tr><td><strong>${esc(r.kind.toUpperCase())}</strong> <span class="muted small">${esc(r.label)}</span>
      ${r.sustains ? "" : '<span class="pill no">can\'t keep up</span>'}</td><td>${pct(r.busy_pct)}</td><td>${pct(r.cpu_pct)}</td><td>${pct(r.gpu_pct)}</td>
      <td>${r.power_w == null ? "—" : `${r.power_w} W`}</td><td>${r.battery_h == null ? "—" : `${r.battery_h} h`}</td><td>${r.cycles_per_year ?? "—"}</td></tr>`).join("");
    $("imFindings").innerHTML = m.findings.map((x) => `<li>${esc(x)}</li>`).join("");
    $("imLifespan").textContent = v.lifespan ? v.lifespan.text : "";
  }
  setInterval(refreshBattery, 3000);

  // power chart (single series, its own axis - never on the % chart)
  const pc = $("powerChart"), pctx = pc.getContext("2d");
  function drawPower() {
    const dpr = window.devicePixelRatio || 1, W = pc.clientWidth, H = pc.clientHeight;
    if (!W) return;
    if (pc.width !== W * dpr || pc.height !== H * dpr) { pc.width = W * dpr; pc.height = H * dpr; }
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0); pctx.clearRect(0, 0, W, H);
    const now = history.length ? history[history.length - 1].ts : Date.now() / 1000, t0 = now - spanSec;
    const pts = history.filter((s) => s.ts >= t0 && s.cpu.power_w != null);
    const P = { l: 38, r: 10, t: 8, b: 18 }, pw = W - P.l - P.r, ph = H - P.t - P.b;
    const max = Math.max(5, ...pts.map((s) => s.cpu.power_w)) * 1.15;
    const step = max > 60 ? 20 : max > 25 ? 10 : 5;
    const x = (t) => P.l + ((t - t0) / spanSec) * pw, y = (v) => P.t + ph - (v / max) * ph;
    pctx.strokeStyle = css("--grid"); pctx.fillStyle = css("--text-muted"); pctx.font = chartFont(11);
    pctx.textAlign = "right"; pctx.textBaseline = "middle"; pctx.lineWidth = 1;
    for (let v = 0; v <= max; v += step) { pctx.beginPath(); pctx.moveTo(P.l, y(v) + 0.5); pctx.lineTo(W - P.r, y(v) + 0.5); pctx.stroke(); pctx.fillText(`${v} W`, P.l - 6, y(v)); }
    if (!pts.length) { pctx.textAlign = "center"; pctx.fillText("No power sensor reading (unplug the charger on a laptop)", P.l + pw / 2, P.t + ph / 2); return; }
    pctx.strokeStyle = css("--npu"); pctx.lineWidth = 2; pctx.lineJoin = "round"; pctx.beginPath();
    pts.forEach((s, i) => (i ? pctx.lineTo(x(s.ts), y(s.cpu.power_w)) : pctx.moveTo(x(s.ts), y(s.cpu.power_w))));
    pctx.stroke();
  }
  new ResizeObserver(drawPower).observe(pc);

  // ---------- fleet ----------
  const aiPill = (c) => !c ? "—" : `<span class="pill ${c.class === "Copilot+ AI PC" ? "ok" : c.is_ai_pc ? "mid" : "no"}" title="${esc(c.reason)}">${esc(c.class)}</span>`;
  async function refreshFleet() {
    let list;
    try { list = await api("/api/fleet"); } catch { return; }
    $("fleetTbl").tBodies[0].innerHTML = list.map((m) => {
      const n = m.node || {}, x = n.metrics || {}, b = n.battery || null;
      const al = (n.alerts || []).filter((a) => a.level !== "info");
      return `<tr><td><span class="dot ${m.online ? "on" : "off"}"></span><strong>${esc(m.self ? `${n.host} (this machine)` : m.name)}</strong>
          <div class="muted small">${esc(n.cpu || m.error || m.url)}${n.machine_type ? ` · ${esc(n.machine_type)}` : ""}</div></td>
        <td>${aiPill(n.ai_pc)}</td><td>${pct(x.npu)}</td><td>${pct(x.cpu)}</td><td>${x.gpu == null ? "—" : pct(x.gpu)}</td><td>${num(x.ips)}</td>
        <td>${b ? `${pct(b.percent)}${b.plugged ? " ⚡" : ""}` : "—"}</td><td>${b && b.health_pct != null ? `${b.health_pct}%` : "—"}</td>
        <td>${n.report ? n.report.score : "—"}</td>
        <td class="small" style="white-space:normal">${al.length ? al.map((a) => `<span class="pill ${a.level === "critical" ? "no" : "mid"}">${esc(a.title)}</span>`).join(" ") : "—"}</td>
        <td>${m.self ? "" : `<button class="iconbtn" data-rm="${esc(m.id)}" title="Remove" aria-label="Remove ${esc(m.name)}">✕</button>`}</td></tr>`;
    }).join("");
  }
  $("fleetTbl").addEventListener("click", async (e) => {
    const id = e.target.dataset?.rm;
    if (id && confirm("Remove this machine from the fleet?")) { await api(`/api/fleet/peers/${id}`, { method: "DELETE" }); refreshFleet(); }
  });
  $("peerForm").onsubmit = async (e) => {
    e.preventDefault();
    $("peerMsg").textContent = "Connecting…";
    try {
      const p = await postJSON("/api/fleet/peers", { url: $("peerUrl").value, token: $("peerToken").value, name: $("peerName").value });
      $("peerMsg").textContent = `Added ${p.name}.`; $("peerForm").reset(); refreshFleet();
    } catch (err) { $("peerMsg").innerHTML = `<span class="err">${esc(err.message)}</span>`; }
  };
  $("fleetRunBtn").onclick = async () => {
    $("fleetRunBtn").disabled = true; $("fleetRun").hidden = false; $("fleetCompare").hidden = true;
    try {
      const { id } = await postJSON("/api/fleet/run", { seconds: Number($("fleetSecs").value) });
      for (;;) {
        const r = await api(`/api/fleet/runs/${id}`);
        $("fleetProgress").innerHTML = r.machines.map((m) => `<div>${esc(m.name)}: ${esc(m.status)} ${m.status === "running" ? `${Math.round(m.progress * 100)}%` : ""}
          ${m.score != null ? `· ${m.score}/100 · ${esc(m.ai_pc || "")}` : ""} ${m.error ? `<span class="err">${esc(m.error)}</span>` : ""}</div>`).join("");
        if (r.status === "done") {
          if (r.comparison) { renderCompare(r.comparison, "fleetRank", "fleetWhy", "fleetCaveats"); $("fleetCompare").hidden = false; }
          break;
        }
        await new Promise((res) => setTimeout(res, 1000));
      }
      refreshFleet(); loadSaved();
    } catch (e) { $("fleetProgress").innerHTML = `<span class="err">${esc(e.message)}</span>`; }
    finally { $("fleetRunBtn").disabled = false; }
  };
  setInterval(refreshFleet, 4000);

  // ---------- boot ----------
  (async () => {
    try { await loadSystem(); } catch (e) { $("host").textContent = `Could not reach the server: ${e.message}`; }
    try { history = await api("/api/history?seconds=900"); draw(); } catch { /* starts empty */ }
    connect();
    refreshImpact();
    loadSaved();
    refreshAlerts(); refreshBattery(); refreshFleet();
  })();
})();
