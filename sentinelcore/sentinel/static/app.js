// SentinelCore web UI — dependency-free ES module (works fully offline).
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $("#view");
const state = { me: null, sites: [], timer: null, route: "" };

// ---------------------------------------------------------------- helpers --
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NA = '<span class="na">Not supported by device</span>';
const fmt = (v, unit = "", digits = 1) => (v === undefined || v === null || v === "" ? NA : `${Number(v).toFixed(digits)}${unit}`);
const can = (p) => state.me?.permissions.includes(p);
function ago(iso) {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
const localTime = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 3500);
}

async function api(path, opts = {}) {
  const o = { credentials: "same-origin", headers: {}, ...opts };
  if (o.json !== undefined) {
    o.body = JSON.stringify(o.json);
    o.headers["Content-Type"] = "application/json";
    delete o.json;
  }
  const r = await fetch(path, o);
  if (r.status === 401 && !path.startsWith("/api/auth/login")) {
    state.me = null;
    renderLogin();
    throw new Error("Session expired");
  }
  const ct = r.headers.get("content-type") || "";
  const body = ct.includes("json") ? await r.json() : await r.text();
  if (!r.ok) {
    let d = body?.detail ?? body;
    if (Array.isArray(d)) d = d.map((x) => `${(x.loc || []).slice(1).join(".")}: ${x.msg}`).join("; ");
    else if (typeof d === "object") d = JSON.stringify(d);
    throw new Error(d || `HTTP ${r.status}`);
  }
  return body;
}

const statusBadge = (s) =>
  s === "online" ? '<span class="badge ok"><span class="dot ok"></span>Online</span>'
  : s === "offline" ? '<span class="badge bad"><span class="dot bad"></span>Offline</span>'
  : '<span class="badge neutral"><span class="dot neutral"></span>Unknown</span>';
const sevBadge = (s) => `<span class="badge ${s === "critical" ? "bad" : s === "warning" ? "warn" : "info"}">${esc(s)}</span>`;
const evStatusBadge = (s) => `<span class="badge ${{ new: "info", acknowledged: "neutral", true_alarm: "bad", false_alarm: "ok" }[s] || "neutral"}">${esc(s.replace("_", " "))}</span>`;

function meter(pct, kind) {
  if (pct === undefined || pct === null) return NA;
  const p = Math.max(0, Math.min(100, pct));
  const cls = kind || (p < 10 ? "bar-bad" : p < 20 ? "bar-warn" : "bar-ok");
  return `<svg class="meter" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label="${p.toFixed(0)}%"><rect class="bar-bg" width="100" height="8" rx="4"/><rect class="${cls}" width="${p}" height="8" rx="4"/></svg>`;
}

function lineChart(series, { height = 160, yMax = null, yMin = 0, unit = "", step = false } = {}) {
  // series: [{points:[[iso, value]], cls}]
  const all = series.flatMap((s) => s.points);
  if (!all.length) return '<div class="empty">No data in this period yet.</div>';
  const W = 600, H = height, L = 38, R = 8, T = 8, B = 20;
  const xs = all.map((p) => new Date(p[0]).getTime());
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x1 - x0 < 60000) { x0 -= 1800000; x1 += 1800000; } // single sample: show a 1 h window
  const vals = all.map((p) => p[1]);
  const lo = yMin ?? Math.min(...vals);
  const hi = yMax ?? Math.max(...vals, lo + 1);
  const X = (t) => L + ((t - x0) / Math.max(1, x1 - x0)) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - T - B);
  let grid = "", axis = "";
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4, y = Y(v);
    grid += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>`;
    axis += `<text x="${L - 4}" y="${y + 3}" text-anchor="end">${+v.toFixed(1)}${unit}</text>`;
  }
  for (let i = 0; i <= 3; i++) {
    const t = x0 + ((x1 - x0) * i) / 3;
    const d = new Date(t);
    axis += `<text x="${X(t)}" y="${H - 4}" text-anchor="${i === 0 ? "start" : i === 3 ? "end" : "middle"}">${d.toLocaleDateString([], { day: "2-digit", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</text>`;
  }
  const paths = series.map((s, i) => {
    let d = "";
    s.points.forEach((p, j) => {
      const x = X(new Date(p[0]).getTime()), y = Y(p[1]);
      if (j === 0) d += `M${x},${y}`;
      else if (step) d += `H${x}V${y}`;
      else d += `L${x},${y}`;
    });
    const area = i === 0 && s.points.length > 1 ? `<path class="area" d="${d}V${Y(lo)}H${X(new Date(s.points[0][0]).getTime())}Z"/>` : "";
    const dots = s.points.length <= 3 ? s.points.map((p) => `<circle class="dotpt" cx="${X(new Date(p[0]).getTime())}" cy="${Y(p[1])}" r="3"/>`).join("") : "";
    return `${area}<path class="line ${s.cls || ""}" d="${d}"/>${dots}`;
  }).join("");
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img"><g class="grid">${grid}</g><g class="axis">${axis}</g>${paths}</svg></div>`;
}

function hbars(rows, { max = null, cls = "bar-acc" } = {}) {
  if (!rows.length) return '<div class="empty">Nothing to show.</div>';
  const m = max ?? Math.max(...rows.map((r) => r.value), 1);
  return `<div class="list">${rows.map((r) => `<div class="list-item"><div class="main-col"><div class="small">${esc(r.label)}</div>
    <svg class="meter" viewBox="0 0 100 8" preserveAspectRatio="none"><rect class="bar-bg" width="100" height="8" rx="4"/><rect class="${r.cls || cls}" width="${(100 * r.value) / m}" height="8" rx="4"/></svg></div>
    <div class="num small">${esc(r.text ?? r.value)}</div></div>`).join("")}</div>`;
}

const siteOptions = (sel = "", any = true) =>
  (any ? '<option value="">All sites</option>' : "") + state.sites.map((s) => `<option value="${s.id}" ${String(sel) === String(s.id) ? "selected" : ""}>${esc(s.name)}</option>`).join("");

function openDrawer(html) {
  $("#drawerBody").innerHTML = html;
  $("#drawer").hidden = false;
}
const closeDrawer = () => { $("#drawer").hidden = true; };

function download(name, text, type = "text/csv") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ------------------------------------------------------------------ auth ---
function renderLogin(msg = "") {
  clearInterval(state.timer);
  $("#sidebar").hidden = true;
  $("#topbar").hidden = true;
  view.className = "";
  view.innerHTML = `<div class="login-wrap"><div class="card login">
    <h1>SentinelCore</h1><div class="muted">On-premise AI video analytics &amp; device health</div>
    <form id="loginForm">
      <label class="field">Username<input name="username" autocomplete="username" required></label>
      <label class="field">Password<input name="password" type="password" autocomplete="current-password" required></label>
      <div class="err" id="loginErr">${esc(msg)}</div>
      <button class="btn primary" type="submit">Sign in</button>
    </form></div></div>`;
  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const r = await api("/api/auth/login", { method: "POST", json: { username: f.get("username"), password: f.get("password") } });
      state.me = r.user;
      await boot();
    } catch (err) {
      $("#loginErr").textContent = err.message;
    }
  };
}

// ------------------------------------------------------------------ shell --
const ROUTES = [
  { id: "overview", title: "Overview", perm: "view", render: renderOverview, sep: "Monitor" },
  { id: "cameras", title: "Camera health", perm: "view", render: renderCameras },
  { id: "batteries", title: "Battery health", perm: "view", render: renderBatteries },
  { id: "nvrs", title: "NVR status", perm: "view", render: renderNvrs },
  { id: "alerts", title: "Health alerts", perm: "view", render: renderAlerts, sep: "Respond" },
  { id: "events", title: "AI events", perm: "view", render: renderEvents },
  { id: "devices", title: "Add & import devices", perm: "manage_devices", render: renderDevices, sep: "Administer" },
  { id: "rules", title: "Alert rules", perm: "manage_rules", render: renderRules },
  { id: "users", title: "Users & sites", perm: "manage_users", render: renderUsers },
  { id: "edge", title: "Edge devices", perm: "manage_edge", render: renderEdge },
  { id: "audit", title: "Audit log", perm: "view_audit", render: renderAudit },
];

function renderNav() {
  $("#nav").innerHTML = ROUTES.filter((r) => can(r.perm)).map((r) =>
    `${r.sep ? `<div class="sep">${r.sep}</div>` : ""}<a href="#/${r.id}" data-id="${r.id}">${r.title}</a>`).join("");
  const sites = state.me.role === "super_admin" || state.me.role === "auditor" ? "All sites" : state.me.sites.map((s) => s.name).join(", ") || "No sites assigned";
  $("#whoami").innerHTML = `<strong>${esc(state.me.full_name || state.me.username)}</strong><br>${esc(state.me.role.replace("_", " "))} · ${esc(sites)}`;
}

async function route() {
  const id = (location.hash.replace(/^#\//, "") || "overview").split("?")[0];
  const r = ROUTES.find((x) => x.id === id && can(x.perm)) || ROUTES[0];
  state.route = r.id;
  $$("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.id === r.id));
  $("#pageTitle").textContent = r.title;
  $("#sidebar").classList.remove("open");
  clearInterval(state.timer);
  view.className = "view";
  view.innerHTML = '<div class="muted">Loading…</div>';
  const run = async () => {
    try {
      await r.render();
      $("#updated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (e) {
      if (e.message !== "Session expired") view.innerHTML = `<div class="card err">${esc(e.message)}</div>`;
    }
  };
  await run();
  if (r.refresh !== false && ["overview", "cameras", "batteries", "nvrs", "alerts", "events"].includes(r.id)) {
    state.timer = setInterval(() => { if (state.route === r.id && $("#drawer").hidden && !document.activeElement?.matches("input,select,textarea")) run(); }, 30000);
  }
}

async function boot() {
  try {
    state.me = state.me || (await api("/api/auth/me"));
  } catch {
    return renderLogin();
  }
  state.sites = await api("/api/sites");
  $("#sidebar").hidden = false;
  $("#topbar").hidden = false;
  renderNav();
  route();
}

// --------------------------------------------------------------- overview --
async function renderOverview() {
  const [s, trend, worst, evs, alerts] = await Promise.all([
    api("/api/health/summary"), api("/api/health/trend?hours=24"), api("/api/health/worst?hours=24&limit=8"),
    api("/api/events/stats?days=7"), api("/api/alerts?status=active&limit=8"),
  ]);
  $("#simBadge").hidden = !s.simulated;
  const c = s.cameras, n = s.nvrs, b = s.battery, st = s.storage;
  const kpi = (label, value, sub = "", cls = "") => `<div class="card kpi ${cls}"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
  const issues = Object.entries(c.image_issues || {});
  view.innerHTML = `
  <div class="grid kpis">
    ${kpi("Cameras online", `${c.online}/${c.total}`, c.online_pct == null ? "" : `${c.online_pct}% online`, c.offline ? "warn" : "ok")}
    ${kpi("Cameras offline", c.offline, c.unknown ? `${c.unknown} not checked yet` : "&nbsp;", c.offline ? "bad" : "ok")}
    ${kpi("NVRs healthy", `${n.healthy}/${n.total}`, n.fault ? `${n.fault} with faults` : "All healthy", n.fault ? "bad" : "ok")}
    ${kpi("Low batteries", b.low, b.devices ? `${b.reporting}/${b.devices} battery devices reporting` : "No battery devices", b.critical ? "bad" : b.low ? "warn" : "ok")}
    ${kpi("Disk errors", st.disk_errors, st.min_retention_days != null ? `Min retention ${st.min_retention_days} days` : "Retention not reported", st.disk_errors ? "bad" : "ok")}
    ${kpi("Open alerts", s.alerts.open, Object.entries(s.alerts.by_severity).map(([k, v]) => `${v} ${k}`).join(" · ") || "None", s.alerts.by_severity.critical ? "bad" : s.alerts.open ? "warn" : "ok")}
    ${kpi("New AI events", s.events_new, evs.false_alarm_pct != null ? `${evs.false_alarm_pct}% false alarms (7d)` : "No reviewed events yet")}
  </div>
  <div class="grid cols-2">
    <div class="card"><h2>Camera uptime, last 24 h <span class="right muted small">% of checks online</span></h2>${lineChart([{ points: trend.map((t) => [t.hour, t.online_pct]) }], { yMax: 100, unit: "%" })}</div>
    <div class="card"><h2>Active alerts <a class="right small" href="#/alerts">View all</a></h2>${alertList(alerts)}</div>
  </div>
  <div class="grid cols-3">
    <div class="card"><h2>Sites</h2>${s.sites.length ? `<div class="table-wrap"><table><thead><tr><th>Site</th><th class="num">Cameras</th><th class="num">Online</th><th class="num">NVR faults</th></tr></thead><tbody>
      ${s.sites.map((x) => `<tr><td>${esc(x.name)}</td><td class="num">${x.cameras}</td><td class="num">${x.online_pct ?? "—"}%</td><td class="num">${x.nvr_faults ? `<span class="badge bad">${x.nvr_faults}</span>` : "0"}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No devices yet.</div>'}</div>
    <div class="card"><h2>Least reliable cameras (24 h)</h2>${hbars(worst.map((w) => ({ label: `${w.name} · ${w.site}`, value: w.uptime_pct, text: `${w.uptime_pct}%`, cls: w.uptime_pct < 80 ? "bar-bad" : "bar-warn" })), { max: 100 })}</div>
    <div class="card"><h2>Image &amp; stream issues now</h2>${hbars(issues.map(([k, v]) => ({ label: k.replace("_", " "), value: v, cls: "bar-warn" })))}</div>
  </div>
  <div class="card"><h2>AI events by type (7 days)</h2>${hbars(Object.entries(evs.by_type).sort((a, b) => b[1].total - a[1].total).map(([k, v]) => ({ label: k.replaceAll("_", " "), value: v.total, text: `${v.total} (${v.false_alarm} false)` })))}</div>`;
  bindAlertAcks(view);
}

function alertList(alerts) {
  if (!alerts.length) return '<div class="empty">No active alerts.</div>';
  return `<div class="list">${alerts.map((a) => `<div class="list-item">${sevBadge(a.severity)}
    <div class="main-col"><div class="title">${esc(a.message)}</div><div class="muted small">${esc(a.device_type)} · opened ${ago(a.opened_at)}${a.acknowledged_by ? ` · ack by ${esc(a.acknowledged_by)}` : ""}</div></div>
    ${a.status === "open" && can("ack") ? `<button class="btn small" data-ack="${a.id}">Acknowledge</button>` : `<span class="badge neutral">${esc(a.status)}</span>`}</div>`).join("")}</div>`;
}
function bindAlertAcks(root) {
  $$("[data-ack]", root).forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try { await api(`/api/alerts/${b.dataset.ack}/ack`, { method: "POST" }); toast("Alert acknowledged"); route(); } catch (e) { toast(e.message); b.disabled = false; }
  }));
}

// ---------------------------------------------------------------- cameras --
const camFilters = { site_id: "", status: "", power_type: "", q: "" };
async function renderCameras() {
  const qs = new URLSearchParams(Object.entries(camFilters).filter(([, v]) => v)).toString();
  const cams = await api(`/api/cameras?${qs}`);
  $("#simBadge").hidden = !cams.some((c) => c.health.data.source === "simulator");
  const imgFlags = (d) => ["blurred", "blank", "frozen", "too_dark", "too_bright", "view_changed"].filter((f) => d[f]);
  view.innerHTML = `
  <div class="toolbar">
    <input class="grow" id="fq" placeholder="Search name, zone or IP" value="${esc(camFilters.q)}">
    <select id="fsite">${siteOptions(camFilters.site_id)}</select>
    <select id="fstatus"><option value="">Any status</option>${["online", "offline", "unknown"].map((s) => `<option ${camFilters.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    <select id="fpower"><option value="">Any power</option>${["poe", "mains", "battery", "solar"].map((s) => `<option ${camFilters.power_type === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    <button class="btn" id="exportCsv">Export CSV</button>
  </div>
  <div class="card"><div class="muted small">${cams.length} cameras · click a row for details and history</div>
  <div class="table-wrap"><table><thead><tr><th>Camera</th><th>Site / zone</th><th>Status</th><th>Last seen</th><th class="num">FPS</th><th class="num">Bitrate</th><th class="num">Latency</th><th>Image</th><th>Power</th><th>Firmware</th></tr></thead><tbody>
  ${cams.map((c) => { const d = c.health.data; const fl = imgFlags(d); const lowFps = d.fps != null && d.fps < 0.6 * c.target_fps; return `<tr class="clickable" data-cam="${c.id}">
    <td><strong>${esc(c.name)}</strong><div class="muted small">${esc(c.nvr ? `${c.nvr} CH${c.channel}` : c.host)}</div></td>
    <td>${esc(c.site)}<div class="muted small">${esc([c.building, c.floor && `Floor ${c.floor}`, c.zone].filter(Boolean).join(" · "))}</div></td>
    <td>${statusBadge(c.health.status)}</td><td class="small">${ago(c.health.last_seen)}</td>
    <td class="num">${d.fps != null ? `<span class="${lowFps ? "badge warn" : ""}">${d.fps}</span><span class="muted small">/${c.target_fps}</span>` : NA}</td>
    <td class="num">${d.bitrate_kbps != null ? `${Math.round(d.bitrate_kbps)} kbps` : NA}</td>
    <td class="num">${d.latency_ms != null ? `${d.latency_ms} ms` : "—"}</td>
    <td>${c.health.status !== "online" ? "—" : fl.length ? fl.map((f) => `<span class="badge warn">${f.replace("_", " ")}</span>`).join(" ") : d.sharpness != null ? '<span class="badge ok">OK</span>' : NA}</td>
    <td>${c.power_type === "battery" || c.power_type === "solar" ? (d.battery_pct != null ? `${d.battery_pct}%` : NA) : esc(c.power_type.toUpperCase())}</td>
    <td class="small">${d.firmware ? esc(d.firmware) : NA}</td></tr>`; }).join("") || '<tr><td colspan="10" class="empty">No cameras match.</td></tr>'}
  </tbody></table></div></div>`;
  const reload = () => renderCameras();
  $("#fq").onchange = (e) => { camFilters.q = e.target.value; reload(); };
  $("#fsite").onchange = (e) => { camFilters.site_id = e.target.value; reload(); };
  $("#fstatus").onchange = (e) => { camFilters.status = e.target.value; reload(); };
  $("#fpower").onchange = (e) => { camFilters.power_type = e.target.value; reload(); };
  $("#exportCsv").onclick = async () => download("cameras.csv", await api("/api/cameras/export.csv"));
  $$("[data-cam]").forEach((tr) => (tr.onclick = () => cameraDetail(tr.dataset.cam)));
}

async function cameraDetail(id, hours = 24) {
  const c = await api(`/api/cameras/${id}`);
  const battery = c.power_type === "battery" || c.power_type === "solar";
  const keys = ["online", "fps", "latency_ms", "bitrate_kbps"].concat(battery ? ["battery_pct"] : []);
  const m = await api(`/api/metrics/camera/${id}?hours=${hours}&keys=${keys.join(",")}`);
  const d = c.health.data;
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  openDrawer(`<h2>${esc(c.name)}</h2>
    <div class="toolbar">${statusBadge(c.health.status)} <span class="muted small">checked ${ago(c.health.last_checked)}</span>
    ${d.source === "simulator" ? '<span class="badge warn">SIMULATED</span>' : ""}
    <span class="grow"></span><select id="dHours">${[1, 6, 24, 168, 720].map((h) => `<option value="${h}" ${h === hours ? "selected" : ""}>${h < 48 ? `${h} h` : `${h / 24} days`}</option>`).join("")}</select>
    <button class="btn small" id="checkNow">Check now</button>
    ${can("manage_devices") ? '<button class="btn small" id="resetRef" title="Use the current view as the reference for tamper / view-changed detection">Reset reference view</button>' : ""}</div>
    ${c.health.error ? `<div class="card err small">${esc(c.health.error)}</div>` : ""}
    <div class="card"><h2>Stream</h2><dl class="kv">
      ${row("Measured FPS", d.fps != null ? `${d.fps} of ${c.target_fps} target` : NA)}${row("Bitrate", fmt(d.bitrate_kbps, " kbps", 0))}
      ${row("Resolution", d.width ? `${d.width}×${d.height}` : NA)}${row("Codec", d.codec ? esc(d.codec.toUpperCase()) : NA)}
      ${row("RTSP latency", fmt(d.latency_ms, " ms"))}${row("Packet loss", fmt(d.packet_loss_pct, "%", 2))}
      ${row("Clock drift", fmt(d.time_drift_s, " s"))}</dl></div>
    <div class="card"><h2>Image health</h2><dl class="kv">
      ${row("Brightness (0–255)", fmt(d.brightness))}${row("Contrast", fmt(d.contrast))}${row("Sharpness", fmt(d.sharpness))}
      ${row("Flags", ["blurred", "blank", "frozen", "too_dark", "too_bright", "view_changed"].filter((f) => f in d).map((f) => `<span class="badge ${d[f] ? "warn" : "ok"}">${f.replace("_", " ")}: ${d[f] ? "yes" : "no"}</span>`).join(" ") || NA)}</dl></div>
    ${battery ? `<div class="card"><h2>Battery &amp; power</h2><dl class="kv">
      ${row("Charge", d.battery_pct != null ? `${d.battery_pct}% ${meter(d.battery_pct)}` : NA)}${row("Voltage", fmt(d.battery_voltage, " V", 2))}
      ${row("Charging", d.charging == null ? NA : d.charging ? "Yes" : "No")}${row("Temperature", fmt(d.battery_temp_c, " °C"))}
      ${row("Est. time left", fmt(d.est_hours_left, " h"))}${row("Solar input", c.power_type === "solar" ? fmt(d.solar_w, " W") : "—")}
      ${row("Signal", fmt(d.signal_dbm, " dBm", 0))}</dl></div>` : ""}
    <div class="card"><h2>Online history</h2>${lineChart([{ points: m.online }], { yMax: 1, height: 90, step: true })}</div>
    <div class="card"><h2>FPS</h2>${lineChart([{ points: m.fps }], { yMax: Math.max(c.target_fps, 1) })}</div>
    <div class="card"><h2>Latency (ms)</h2>${lineChart([{ points: m.latency_ms }], { yMin: 0 })}</div>
    ${battery ? `<div class="card"><h2>Battery %</h2>${lineChart([{ points: m.battery_pct }], { yMax: 100, unit: "%" })}</div>` : ""}
    <div class="card"><h2>Device</h2><dl class="kv">${row("Site", esc(c.site))}${row("Location", esc([c.building, c.floor, c.zone].filter(Boolean).join(" / ") || "—"))}
      ${row("NVR", c.nvr ? `${esc(c.nvr)} CH${c.channel}` : "—")}${row("Vendor / model", esc(`${c.vendor} ${c.model || d.model || ""}`))}
      ${row("Host", esc(c.host || "—"))}${row("Main stream", esc(c.rtsp_url || "—"))}${row("Sub stream", esc(c.sub_stream_url || "—"))}
      ${row("Driver", esc(c.driver))}${row("Analytics", c.analytics.length ? c.analytics.map((a) => esc(a.type)).join(", ") : "None configured")}</dl></div>`);
  $("#dHours").onchange = (e) => cameraDetail(id, +e.target.value);
  $("#checkNow").onclick = async (e) => { e.target.disabled = true; e.target.textContent = "Checking…"; try { await api(`/api/cameras/${id}/check`, { method: "POST" }); cameraDetail(id, hours); } catch (er) { toast(er.message); } };
  const rr = $("#resetRef");
  if (rr) rr.onclick = async () => { await api(`/api/cameras/${id}/reset-reference`, { method: "POST" }); toast("Reference view reset; next check sets a new one"); };
}

// -------------------------------------------------------------- batteries --
async function renderBatteries() {
  const cams = (await api("/api/cameras")).filter((c) => c.power_type === "battery" || c.power_type === "solar");
  cams.sort((a, b) => (a.health.data.battery_pct ?? 999) - (b.health.data.battery_pct ?? 999));
  const rep = cams.filter((c) => c.health.data.battery_pct != null);
  const low = rep.filter((c) => c.health.data.battery_pct < 20).length;
  const avg = rep.length ? rep.reduce((s, c) => s + c.health.data.battery_pct, 0) / rep.length : null;
  view.innerHTML = `<div class="grid kpis">
    <div class="card kpi"><div class="label">Battery / solar devices</div><div class="value">${cams.length}</div><div class="sub">${rep.length} reporting battery data</div></div>
    <div class="card kpi ${low ? "warn" : "ok"}"><div class="label">Below 20%</div><div class="value">${low}</div><div class="sub">&nbsp;</div></div>
    <div class="card kpi"><div class="label">Average charge</div><div class="value">${avg == null ? "—" : `${avg.toFixed(0)}%`}</div><div class="sub">&nbsp;</div></div>
    <div class="card kpi"><div class="label">Charging now</div><div class="value">${rep.filter((c) => c.health.data.charging).length}</div><div class="sub">&nbsp;</div></div></div>
  <div class="card"><h2>Battery health <span class="right muted small">sorted lowest first · "Not supported" = the device does not report this</span></h2>
  <div class="table-wrap"><table><thead><tr><th>Camera</th><th>Site</th><th>Status</th><th>Charge</th><th></th><th class="num">Voltage</th><th>Charging</th><th class="num">Temp</th><th class="num">Time left</th><th class="num">Solar</th><th class="num">Signal</th></tr></thead><tbody>
  ${cams.map((c) => { const d = c.health.data; return `<tr class="clickable" data-cam="${c.id}"><td><strong>${esc(c.name)}</strong><div class="muted small">${esc(c.power_type)}</div></td><td>${esc(c.site)}</td><td>${statusBadge(c.health.status)}</td>
    <td class="num">${d.battery_pct != null ? `${d.battery_pct}%` : NA}</td><td>${d.battery_pct != null ? meter(d.battery_pct) : ""}</td>
    <td class="num">${fmt(d.battery_voltage, " V", 2)}</td><td>${d.charging == null ? NA : d.charging ? '<span class="badge ok">yes</span>' : "no"}</td>
    <td class="num">${fmt(d.battery_temp_c, " °C")}</td><td class="num">${fmt(d.est_hours_left, " h", 0)}</td>
    <td class="num">${c.power_type === "solar" ? fmt(d.solar_w, " W") : "—"}</td><td class="num">${fmt(d.signal_dbm, " dBm", 0)}</td></tr>`; }).join("") || '<tr><td colspan="11" class="empty">No battery or solar cameras.</td></tr>'}
  </tbody></table></div></div>`;
  $$("[data-cam]").forEach((tr) => (tr.onclick = () => cameraDetail(tr.dataset.cam)));
}

// ------------------------------------------------------------------ NVRs ---
async function renderNvrs() {
  const nvrs = await api("/api/nvrs");
  view.innerHTML = `<div class="card"><h2>NVR / DVR status</h2><div class="table-wrap"><table><thead><tr>
    <th>NVR</th><th>Site</th><th>Status</th><th>Last seen</th><th class="num">Cameras</th><th>Recording</th><th>Disks</th><th>Storage used</th><th></th><th class="num">Retention</th><th class="num">Temp</th><th>Firmware</th></tr></thead><tbody>
  ${nvrs.map((n) => { const d = n.health.data; const used = d.storage_used_pct; return `<tr class="clickable" data-nvr="${n.id}">
    <td><strong>${esc(n.name)}</strong><div class="muted small">${esc(n.vendor)} ${esc(d.model || n.model)} · ${esc(n.host)}</div></td><td>${esc(n.site)}</td>
    <td>${statusBadge(n.health.status)}</td><td class="small">${ago(n.health.last_seen)}</td><td class="num">${n.camera_count}/${n.channels}</td>
    <td>${d.recording_channels != null ? `<span class="badge ${d.recording_channels < d.total_channels ? "warn" : "ok"}">${d.recording_channels}/${d.total_channels} ch</span>` : NA}</td>
    <td>${d.disk_count != null ? (d.disk_errors ? `<span class="badge bad">${d.disk_errors} error / ${d.disk_count}</span>` : `<span class="badge ok">${d.disk_count} OK</span>`) : NA}</td>
    <td class="num">${used != null ? `${used}% of ${(d.storage_total_gb / 1024).toFixed(1)} TB` : NA}</td><td>${used != null ? meter(used, used > 95 ? "bar-bad" : used > 85 ? "bar-warn" : "bar-ok") : ""}</td>
    <td class="num">${d.retention_days != null ? `<span class="${d.retention_days < 7 ? "badge warn" : ""}">${d.retention_days} d</span>` : NA}</td>
    <td class="num">${fmt(d.temp_c, " °C")}</td><td class="small">${d.firmware ? esc(d.firmware) : NA}</td></tr>`; }).join("") || '<tr><td colspan="12" class="empty">No NVRs added.</td></tr>'}
  </tbody></table></div></div>`;
  $$("[data-nvr]").forEach((tr) => (tr.onclick = () => nvrDetail(tr.dataset.nvr)));
}

async function nvrDetail(id) {
  const n = await api(`/api/nvrs/${id}`);
  const m = await api(`/api/metrics/nvr/${id}?hours=168&keys=online,storage_used_pct,temp_c`);
  const cams = await api(`/api/cameras?nvr_id=${id}`);
  const d = n.health.data;
  openDrawer(`<h2>${esc(n.name)}</h2><div class="toolbar">${statusBadge(n.health.status)} <span class="muted small">checked ${ago(n.health.last_checked)}</span>
    ${d.source === "simulator" ? '<span class="badge warn">SIMULATED</span>' : ""}<span class="grow"></span><button class="btn small" id="nCheck">Check now</button></div>
    ${n.health.error ? `<div class="card err small">${esc(n.health.error)}</div>` : ""}
    <div class="card"><h2>Disks</h2>${d.disks ? `<table><thead><tr><th>Disk</th><th>Status</th><th class="num">Capacity</th><th class="num">Free</th></tr></thead><tbody>${d.disks.map((k) => `<tr><td>HDD ${esc(k.id)}</td><td><span class="badge ${k.status === "ok" ? "ok" : "bad"}">${esc(k.status)}</span></td><td class="num">${fmt(k.capacity_gb, " GB", 0)}</td><td class="num">${fmt(k.free_gb, " GB", 0)}</td></tr>`).join("")}</tbody></table>` : `<div class="muted">${NA}. Use the hikvision_isapi driver or a vendor driver to read disk status.</div>`}</div>
    <div class="card"><h2>Storage used, 7 days</h2>${lineChart([{ points: m.storage_used_pct }], { yMax: 100, unit: "%" })}</div>
    <div class="card"><h2>Temperature, 7 days</h2>${lineChart([{ points: m.temp_c }], { yMin: null })}</div>
    <div class="card"><h2>Channels (${cams.length})</h2><div class="list">${cams.map((c) => `<div class="list-item">${statusBadge(c.health.status)}<div class="main-col"><div class="title">CH${c.channel} · ${esc(c.name)}</div></div></div>`).join("") || '<div class="empty">No channels imported.</div>'}</div></div>`);
  $("#nCheck").onclick = async (e) => { e.target.disabled = true; try { await api(`/api/nvrs/${id}/check`, { method: "POST" }); nvrDetail(id); } catch (er) { toast(er.message); } };
}

// ---------------------------------------------------------------- alerts ---
const alertFilters = { status: "active", severity: "", site_id: "" };
async function renderAlerts() {
  const qs = new URLSearchParams(Object.entries(alertFilters).filter(([, v]) => v)).toString();
  const alerts = await api(`/api/alerts?${qs}`);
  view.innerHTML = `<div class="toolbar">
    <select id="aStatus">${["active", "open", "acknowledged", "resolved", "all"].map((s) => `<option ${alertFilters.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    <select id="aSev"><option value="">Any severity</option>${["critical", "warning", "info"].map((s) => `<option ${alertFilters.severity === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    <select id="aSite">${siteOptions(alertFilters.site_id)}</select></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Severity</th><th>Alert</th><th>Device</th><th>Opened</th><th>Status</th><th></th></tr></thead><tbody>
  ${alerts.map((a) => `<tr><td>${sevBadge(a.severity)}</td><td>${esc(a.message)}</td><td>${esc(a.device_type)}</td><td class="small">${localTime(a.opened_at)}</td>
    <td>${esc(a.status)}${a.acknowledged_by ? `<div class="muted small">by ${esc(a.acknowledged_by)}</div>` : ""}${a.resolved_at ? `<div class="muted small">resolved ${ago(a.resolved_at)}</div>` : ""}</td>
    <td>${a.status === "open" && can("ack") ? `<button class="btn small" data-ack="${a.id}">Acknowledge</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="6" class="empty">No alerts.</td></tr>'}
  </tbody></table></div></div>`;
  $("#aStatus").onchange = (e) => { alertFilters.status = e.target.value; renderAlerts(); };
  $("#aSev").onchange = (e) => { alertFilters.severity = e.target.value; renderAlerts(); };
  $("#aSite").onchange = (e) => { alertFilters.site_id = e.target.value; renderAlerts(); };
  bindAlertAcks(view);
}

// ---------------------------------------------------------------- events ---
const evFilters = { status: "new", type: "", site_id: "" };
async function renderEvents() {
  const qs = new URLSearchParams(Object.entries(evFilters).filter(([, v]) => v)).toString();
  const [events, stats] = await Promise.all([api(`/api/events?${qs}`), api("/api/events/stats?days=7")]);
  const types = Object.keys(stats.by_type).sort();
  view.innerHTML = `<div class="toolbar">
    <select id="eStatus"><option value="">Any status</option>${["new", "acknowledged", "true_alarm", "false_alarm"].map((s) => `<option value="${s}" ${evFilters.status === s ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}</select>
    <select id="eType"><option value="">Any type</option>${types.map((t) => `<option ${evFilters.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
    <select id="eSite">${siteOptions(evFilters.site_id)}</select>
    <span class="grow"></span><span class="muted small">False-alarm rate (7 d, reviewed events): <strong>${stats.false_alarm_pct ?? "—"}${stats.false_alarm_pct != null ? "%" : ""}</strong> of ${stats.reviewed}</span></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Time</th><th>Event</th><th>Camera</th><th>Zone</th><th class="num">Confidence</th><th>Source</th><th>Status</th><th></th></tr></thead><tbody>
  ${events.map((e) => `<tr><td class="small">${localTime(e.ts)}</td><td><strong>${esc(e.type.replaceAll("_", " "))}</strong><div class="muted small">${esc(e.object_class)}</div></td>
    <td>${esc(e.camera)}<div class="muted small">${esc(e.site)}</div></td><td>${esc(e.zone)}</td><td class="num">${(e.confidence * 100).toFixed(0)}%</td>
    <td><span class="badge neutral">${esc(e.source)}</span></td><td>${evStatusBadge(e.status)}</td>
    <td>${can("ack") ? `<button class="btn small" data-ev="${e.id}" data-st="true_alarm">True</button> <button class="btn small" data-ev="${e.id}" data-st="false_alarm">False</button>${e.status === "new" ? ` <button class="btn small" data-ev="${e.id}" data-st="acknowledged">Ack</button>` : ""}` : ""}</td></tr>`).join("") || '<tr><td colspan="8" class="empty">No events.</td></tr>'}
  </tbody></table></div><div class="muted small">Marking events True/False feeds the false-alarm statistics used to tune thresholds per camera.</div></div>`;
  $("#eStatus").onchange = (e) => { evFilters.status = e.target.value; renderEvents(); };
  $("#eType").onchange = (e) => { evFilters.type = e.target.value; renderEvents(); };
  $("#eSite").onchange = (e) => { evFilters.site_id = e.target.value; renderEvents(); };
  $$("[data-ev]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try { await api(`/api/events/${b.dataset.ev}/handle`, { method: "POST", json: { status: b.dataset.st } }); renderEvents(); } catch (e) { toast(e.message); b.disabled = false; }
  }));
}

// --------------------------------------------------------------- devices ---
async function renderDevices(tab = "camera") {
  const info = await api("/api/system/info");
  const nvrs = await api("/api/nvrs");
  const tabs = [["camera", "Add camera"], ["csv", "Bulk CSV import"], ["nvr", "Add NVR"], ["channels", "Import NVR channels"], ["discover", "ONVIF discovery"]];
  const opt = (arr, sel) => arr.map((v) => `<option ${v === sel ? "selected" : ""}>${v}</option>`).join("");
  const body = {
    camera: `<form id="camForm" class="card"><div class="form-grid">
      <label class="field">Name*<input name="name" required></label><label class="field">Site*<select name="site_id" required>${siteOptions("", false)}</select></label>
      <label class="field">Vendor<input name="vendor" value="generic"></label><label class="field">Model<input name="model"></label>
      <label class="field">IP / host (ONVIF)<input name="host"></label><label class="field">ONVIF port<input name="onvif_port" type="number" value="80"></label>
      <label class="field">Main stream RTSP URL<input name="rtsp_url" placeholder="rtsp://…"></label><label class="field">Sub stream RTSP URL<input name="sub_stream_url" placeholder="rtsp://…"></label>
      <label class="field">Username<input name="username" autocomplete="off"></label><label class="field">Password<input name="password" type="password" autocomplete="new-password"></label>
      <label class="field">Power<select name="power_type">${opt(["poe", "mains", "battery", "solar"])}</select></label><label class="field">Health driver<select name="driver">${opt(info.camera_drivers, "generic")}</select></label>
      <label class="field">Building<input name="building"></label><label class="field">Floor<input name="floor"></label><label class="field">Zone<input name="zone"></label>
      <label class="field">Target FPS<input name="target_fps" type="number" step="0.1" value="25"></label></div>
      <div class="toolbar"><button class="btn primary" type="submit">Add camera</button><span class="muted small">${info.ffmpeg_available ? "FFmpeg found: FPS, bitrate and image health will be measured." : "FFmpeg not found: only reachability will be checked."}</span></div></form>`,
    csv: `<div class="card"><p class="muted">Paste CSV (or choose a file). Every row is validated first; nothing is imported unless all rows are valid.</p>
      <div class="toolbar"><button class="btn" id="tplBtn">Download template</button><input type="file" id="csvFile" accept=".csv,text/csv"></div>
      <textarea id="csvText" placeholder="name,site,host,rtsp_url,…"></textarea>
      <div class="toolbar"><button class="btn" id="csvCheck">Validate</button><button class="btn primary" id="csvImport">Import</button></div><div id="csvResult"></div></div>`,
    nvr: `<form id="nvrForm" class="card"><div class="form-grid">
      <label class="field">Name*<input name="name" required></label><label class="field">Site*<select name="site_id">${siteOptions("", false)}</select></label>
      <label class="field">Vendor<select name="vendor">${opt(["hikvision", "dahua", "cpplus", "generic"])}</select></label><label class="field">Model<input name="model"></label>
      <label class="field">IP / host*<input name="host" required></label><label class="field">HTTP port<input name="http_port" type="number" value="80"></label>
      <label class="field">RTSP port<input name="rtsp_port" type="number" value="554"></label><label class="field">Channels<input name="channels" type="number" value="16" min="1" max="256"></label>
      <label class="field">Username<input name="username" autocomplete="off"></label><label class="field">Password<input name="password" type="password" autocomplete="new-password"></label>
      <label class="field">Health driver<select name="driver">${opt(info.nvr_drivers, "tcp")}</select></label></div>
      <div class="toolbar"><button class="btn primary" type="submit">Add NVR</button></div></form>`,
    channels: `<form id="chForm" class="card"><p class="muted">Creates one camera per NVR channel using the vendor's RTSP path (Hikvision, Dahua, CP Plus built in) or your own template with {host}, {port}, {ch}.</p><div class="form-grid">
      <label class="field">NVR<select name="nvr">${nvrs.map((n) => `<option value="${n.id}">${esc(n.name)} (${esc(n.vendor)}, ${n.camera_count}/${n.channels})</option>`).join("")}</select></label>
      <label class="field">Channels (blank = all)<input name="channels" placeholder="1-8,10"></label>
      <label class="field">Camera health driver<select name="driver">${opt(info.camera_drivers, "generic")}</select></label>
      <label class="field">Main template (optional)<input name="main_template" placeholder="rtsp://{host}:{port}/…{ch}…"></label>
      <label class="field">Sub template (optional)<input name="sub_template"></label></div>
      <div class="toolbar"><button class="btn primary" type="submit" ${nvrs.length ? "" : "disabled"}>Import channels</button></div><div id="chResult"></div></form>`,
    discover: `<div class="card"><p class="muted">Sends an ONVIF WS-Discovery probe on the server's local network. Multicast does not cross routers: run it per VLAN, or use CSV import.</p>
      <div class="toolbar"><input id="dIface" placeholder="Interface IP (optional)"><button class="btn primary" id="dRun">Discover cameras</button></div><div id="dResult"></div></div>`,
  };
  view.innerHTML = `<div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? "active" : ""}">${l}</button>`).join("")}</div>${body[tab]}`;
  $$("[data-tab]").forEach((b) => (b.onclick = () => renderDevices(b.dataset.tab)));
  const formJson = (f, nums = []) => { const o = Object.fromEntries(new FormData(f)); nums.forEach((k) => { if (o[k] !== undefined && o[k] !== "") o[k] = Number(o[k]); }); return o; };
  if (tab === "camera") $("#camForm").onsubmit = async (e) => {
    e.preventDefault();
    try { const c = await api("/api/cameras", { method: "POST", json: formJson(e.target, ["site_id", "onvif_port", "target_fps"]) }); toast(`Added ${c.name}`); e.target.reset(); } catch (er) { toast(er.message); }
  };
  if (tab === "nvr") $("#nvrForm").onsubmit = async (e) => {
    e.preventDefault();
    try { const n = await api("/api/nvrs", { method: "POST", json: formJson(e.target, ["site_id", "http_port", "rtsp_port", "channels"]) }); toast(`Added ${n.name}. Next: import its channels.`); renderDevices("channels"); } catch (er) { toast(er.message); }
  };
  if (tab === "channels") $("#chForm").onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    const chans = [];
    for (const part of (o.channels || "").split(",").map((s) => s.trim()).filter(Boolean)) {
      const [a, b] = part.split("-").map(Number);
      for (let i = a; i <= (b || a); i++) chans.push(i);
    }
    try {
      const r = await api(`/api/nvrs/${o.nvr}/import-channels`, { method: "POST", json: { channels: chans.length ? chans : null, driver: o.driver, main_template: o.main_template, sub_template: o.sub_template } });
      $("#chResult").innerHTML = `<p><span class="badge ok">${r.created} cameras created</span> (existing channels were skipped)</p>`;
    } catch (er) { toast(er.message); }
  };
  if (tab === "csv") {
    $("#tplBtn").onclick = async () => download("camera_import_template.csv", await api("/api/cameras/import/template"));
    $("#csvFile").onchange = async (e) => { $("#csvText").value = await e.target.files[0].text(); };
    const send = async (dry) => {
      try {
        const r = await api(`/api/cameras/import?dry_run=${dry}`, { method: "POST", body: $("#csvText").value, headers: { "Content-Type": "text/csv" } });
        $("#csvResult").innerHTML = r.errors.length
          ? `<p class="err">${r.errors.length} row(s) have errors — nothing imported.</p><table><tbody>${r.errors.map((x) => `<tr><td>Row ${x.row}</td><td>${esc(x.error)}</td></tr>`).join("")}</tbody></table>`
          : dry ? `<p><span class="badge ok">${r.valid_rows} rows valid</span> Ready to import.</p>` : `<p><span class="badge ok">${r.imported} cameras imported</span></p>`;
      } catch (er) { toast(er.message); }
    };
    $("#csvCheck").onclick = () => send(true);
    $("#csvImport").onclick = () => send(false);
  }
  if (tab === "discover") $("#dRun").onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = "Searching…";
    try {
      const r = await api(`/api/discovery?iface_ip=${encodeURIComponent($("#dIface").value)}`, { method: "POST" });
      $("#dResult").innerHTML = r.length ? `<table><thead><tr><th>Host</th><th>Name</th><th>Hardware</th><th>Service</th><th></th></tr></thead><tbody>${r.map((d) => `<tr><td>${esc(d.host)}:${d.onvif_port}</td><td>${esc(d.name || "")}</td><td>${esc(d.hardware || "")}</td><td class="small">${esc(d.xaddrs[0])}</td><td>${d.already_added ? '<span class="badge neutral">added</span>' : `<button class="btn small" data-add-host="${esc(d.host)}" data-add-port="${d.onvif_port}" data-add-name="${esc(d.name || d.host)}">Add</button>`}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">No ONVIF devices answered on this network segment.</div>';
      $$("[data-add-host]").forEach((b) => (b.onclick = () => {
        renderDevices("camera").then(() => { const f = $("#camForm"); f.host.value = b.dataset.addHost; f.onvif_port.value = b.dataset.addPort; f.name.value = b.dataset.addName; });
      }));
    } catch (er) { toast(er.message); }
    e.target.disabled = false; e.target.textContent = "Discover cameras";
  };
}

// ----------------------------------------------------------------- rules ---
async function renderRules() {
  const rules = await api("/api/alert-rules");
  view.innerHTML = `<div class="card"><h2>Health alert rules</h2><p class="muted small">A rule opens an alert when the condition holds continuously for the duration, and resolves it when the condition clears. Devices that do not report a metric are skipped.</p>
  <div class="table-wrap"><table><thead><tr><th>Name</th><th>Device</th><th>Condition</th><th class="num">For</th><th>Severity</th><th>Enabled</th><th></th></tr></thead><tbody>
  ${rules.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.device_type)}</td><td><code>${esc(r.metric)} ${esc(r.op)} ${r.threshold}</code></td><td class="num">${r.duration_s ? `${Math.round(r.duration_s / 60)} min` : "immediately"}</td>
    <td>${sevBadge(r.severity)}</td><td><input type="checkbox" data-toggle="${r.id}" ${r.enabled ? "checked" : ""} aria-label="Enabled"></td><td><button class="btn small danger" data-del="${r.id}">Delete</button></td></tr>`).join("")}</tbody></table></div></div>
  <form class="card" id="ruleForm"><h2>Add rule</h2><div class="form-grid">
    <label class="field">Name<input name="name" required></label><label class="field">Device<select name="device_type"><option>camera</option><option>nvr</option></select></label>
    <label class="field">Metric<input name="metric" required placeholder="battery_pct, fps_ratio, online, disk_errors…"></label>
    <label class="field">Operator<select name="op">${["<", "<=", ">", ">=", "==", "!="].map((o) => `<option>${o}</option>`).join("")}</select></label>
    <label class="field">Threshold<input name="threshold" type="number" step="any" required></label><label class="field">Duration (seconds)<input name="duration_s" type="number" value="0" min="0"></label>
    <label class="field">Severity<select name="severity"><option>warning</option><option>critical</option><option>info</option></select></label></div>
    <div class="toolbar"><button class="btn primary">Add rule</button></div></form>`;
  $$("[data-toggle]").forEach((cb) => (cb.onchange = async () => {
    const r = rules.find((x) => x.id === +cb.dataset.toggle);
    try { await api(`/api/alert-rules/${r.id}`, { method: "PATCH", json: { ...r, enabled: cb.checked } }); toast("Rule updated"); } catch (e) { toast(e.message); }
  }));
  $$("[data-del]").forEach((b) => (b.onclick = async () => { if (confirm("Delete this rule?")) { await api(`/api/alert-rules/${b.dataset.del}`, { method: "DELETE" }); renderRules(); } }));
  $("#ruleForm").onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    o.threshold = +o.threshold; o.duration_s = +o.duration_s;
    try { await api("/api/alert-rules", { method: "POST", json: o }); renderRules(); } catch (er) { toast(er.message); }
  };
}

// ----------------------------------------------------------------- users ---
async function renderUsers() {
  const users = await api("/api/users");
  state.sites = await api("/api/sites");
  const roles = ["super_admin", "site_admin", "operator", "viewer", "auditor"];
  view.innerHTML = `<div class="grid cols-2"><div class="card"><h2>Users</h2><div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Sites</th><th>Active</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td><strong>${esc(u.username)}</strong><div class="muted small">${esc(u.full_name)}</div></td><td>${esc(u.role.replace("_", " "))}</td>
    <td class="small">${u.role === "super_admin" || u.role === "auditor" ? "All" : esc(u.sites.map((s) => s.name).join(", ") || "None")}</td><td>${u.active ? "Yes" : '<span class="badge neutral">disabled</span>'}</td>
    <td><button class="btn small" data-edit="${u.id}">Edit</button></td></tr>`).join("")}</tbody></table></div></div>
    <div class="card"><h2>Sites</h2><div class="list">${state.sites.map((s) => `<div class="list-item"><div class="main-col"><div class="title">${esc(s.name)}</div><div class="muted small">${esc(s.city)}</div></div></div>`).join("") || '<div class="empty">No sites yet.</div>'}</div>
    <form id="siteForm" class="toolbar"><input name="name" placeholder="New site name" required class="grow"><input name="city" placeholder="City"><button class="btn primary">Add site</button></form></div></div>
    <form class="card" id="userForm"><h2 id="uTitle">Add user</h2><input type="hidden" name="id"><div class="form-grid">
      <label class="field">Username<input name="username" required pattern="[A-Za-z0-9_.\\-]+"></label><label class="field">Full name<input name="full_name"></label>
      <label class="field">Role<select name="role">${roles.map((r) => `<option value="${r}">${r.replace("_", " ")}</option>`).join("")}</select></label>
      <label class="field">Password (min 10)<input name="password" type="password" autocomplete="new-password"></label>
      <label class="field">Sites (site admin / operator / viewer)<select name="site_ids" multiple size="4">${siteOptions("", false)}</select></label>
      <label class="field">Active<select name="active"><option value="true">Yes</option><option value="false">No</option></select></label></div>
      <div class="toolbar"><button class="btn primary">Save user</button><button class="btn" type="reset" id="uReset">Clear</button></div></form>`;
  const f = $("#userForm");
  $$("[data-edit]").forEach((b) => (b.onclick = () => {
    const u = users.find((x) => x.id === +b.dataset.edit);
    f.id.value = u.id; f.username.value = u.username; f.username.readOnly = true; f.full_name.value = u.full_name; f.role.value = u.role; f.active.value = String(u.active);
    [...f.site_ids.options].forEach((o) => (o.selected = u.sites.some((s) => String(s.id) === o.value)));
    $("#uTitle").textContent = `Edit ${u.username}`;
    f.scrollIntoView({ behavior: "smooth" });
  }));
  $("#uReset").onclick = () => { f.username.readOnly = false; $("#uTitle").textContent = "Add user"; f.id.value = ""; };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const body = { username: f.username.value, full_name: f.full_name.value, role: f.role.value, active: f.active.value === "true",
      site_ids: [...f.site_ids.selectedOptions].map((o) => +o.value), password: f.password.value || null };
    try {
      if (f.id.value) await api(`/api/users/${f.id.value}`, { method: "PATCH", json: body });
      else await api("/api/users", { method: "POST", json: body });
      toast("User saved"); renderUsers();
    } catch (er) { toast(er.message); }
  };
  $("#siteForm").onsubmit = async (e) => {
    e.preventDefault();
    try { await api("/api/sites", { method: "POST", json: Object.fromEntries(new FormData(e.target)) }); state.sites = await api("/api/sites"); renderUsers(); } catch (er) { toast(er.message); }
  };
}

// ------------------------------------------------------------------ edge ---
async function renderEdge() {
  const devs = await api("/api/edge-devices");
  view.innerHTML = `<div class="card"><h2>Edge AI devices</h2><p class="muted small">Edge boxes (Jetson, NUC, AI cameras) push analytics events to <code>POST /api/edge/events</code> with header <code>X-Edge-Key</code>. Run <code>python -m sentinel.analytics.runner</code> on the box.</p>
  <table><thead><tr><th>Name</th><th>Site</th><th>Key prefix</th><th>Last seen</th><th></th></tr></thead><tbody>
  ${devs.map((d) => `<tr><td>${esc(d.name)}</td><td>${esc(state.sites.find((s) => s.id === d.site_id)?.name || d.site_id)}</td><td><code>sc_${esc(d.key_prefix)}_…</code></td><td>${ago(d.last_seen)}</td><td><button class="btn small danger" data-del="${d.id}">Revoke</button></td></tr>`).join("") || '<tr><td colspan="5" class="empty">None registered.</td></tr>'}</tbody></table></div>
  <form class="card" id="edgeForm"><h2>Register edge device</h2><div class="toolbar"><input name="name" placeholder="Name" required><select name="site_id">${siteOptions("", false)}</select><button class="btn primary">Create key</button></div><div id="edgeKey"></div></form>`;
  $("#edgeForm").onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target)); o.site_id = +o.site_id;
    try { const r = await api("/api/edge-devices", { method: "POST", json: o }); $("#edgeKey").innerHTML = `<p class="err">${esc(r.note)}</p><pre class="code">${esc(r.api_key)}</pre>`; } catch (er) { toast(er.message); }
  };
  $$("[data-del]").forEach((b) => (b.onclick = async () => { if (confirm("Revoke this device's key?")) { await api(`/api/edge-devices/${b.dataset.del}`, { method: "DELETE" }); renderEdge(); } }));
}

// ----------------------------------------------------------------- audit ---
async function renderAudit() {
  const rows = await api("/api/audit");
  view.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Target</th><th>IP</th></tr></thead><tbody>
  ${rows.map((a) => `<tr><td class="small">${localTime(a.ts)}</td><td>${esc(a.username)}</td><td><code>${esc(a.action)}</code></td><td>${esc(a.target)}</td><td class="small">${esc(a.ip)}</td></tr>`).join("") || '<tr><td colspan="5" class="empty">Empty.</td></tr>'}</tbody></table></div></div>`;
}

// ------------------------------------------------------------------ init ---
function initTheme() {
  let t = null;
  try { t = localStorage.getItem("sc-theme"); } catch { /* storage blocked */ }
  if (t) document.documentElement.dataset.theme = t;
  $("#themeBtn").onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("sc-theme", next); } catch { /* ignore */ }
  };
}
$("#logoutBtn").onclick = async () => { await api("/api/auth/logout", { method: "POST" }); state.me = null; renderLogin(); };
$("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
$("#drawerClose").onclick = closeDrawer;
$("#drawer").onclick = (e) => { if (e.target.id === "drawer") closeDrawer(); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
window.addEventListener("hashchange", () => state.me && route());
initTheme();
boot();
