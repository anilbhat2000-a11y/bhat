// SentinelCore web UI — dependency-free ES module (works fully offline).
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $("#view");
const state = { me: null, locations: [], timer: null, route: "" };

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

// ------------------------------------------------------------- locations --
const KINDS = ["corporate", "region", "zone", "branch", "office", "warehouse", "store", "plant", "building", "floor", "area", "other"];
const multiOrg = () => new Set(state.locations.map((l) => l.org_id)).size > 1;
const locLabel = (l) => (multiOrg() ? `${l.org} › ` : "") + l.path;
function locOptions(sel = "", any = true, filter = () => true) {
  const opts = state.locations.filter(filter).map((l) => {
    const pad = "   ".repeat(l.depth);
    const name = l.depth === 0 && multiOrg() ? `${l.org} › ${l.name}` : l.name;
    return `<option value="${l.id}" ${String(sel) === String(l.id) ? "selected" : ""}>${pad}${l.depth ? "└ " : ""}${esc(name)}</option>`;
  }).join("");
  return (any ? '<option value="">All locations</option>' : "") + opts;
}
const locById = (id) => state.locations.find((l) => l.id === id);
async function refreshLocations() {
  const locs = await api("/api/locations");
  // Indent relative to the highest location each user can see in each organization.
  const minDepth = {};
  locs.forEach((l) => { minDepth[l.org_id] = Math.min(minDepth[l.org_id] ?? 99, l.depth); });
  locs.forEach((l) => { l.depth -= minDepth[l.org_id]; });
  state.locations = locs;
}

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

// Shows the right message for applied vs. sent-for-approval changes.
function changed(res, doneMsg) {
  if (res && res.pending_approval) {
    toast(`Sent for approval (request #${res.request_id}). It applies once someone above you approves it.`);
    refreshApprovalCount();
    return false;
  }
  toast(doneMsg);
  return true;
}

const activeBadge = (enabled) => (enabled ? '<span class="badge ok">Active</span>' : '<span class="badge neutral">Deactivated</span>');
const parentPath = (p) => p.split(" / ").slice(0, -1).join(" / ");
const locCell = (d, extra = "") => `<span title="${esc(d.location_path)}">${esc(d.location)}</span><div class="muted small">${esc(parentPath(d.location_path))}${extra}</div>`;
const makeModel = (d) => esc([d.manufacturer || (d.vendor !== "generic" ? d.vendor : ""), d.model].filter(Boolean).join(" ")) || '<span class="na">Not detected yet</span>';

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
  { id: "overview", title: "Overview", perm: "view", render: renderOverview, sep: "Monitor", live: true },
  { id: "cameras", title: "Camera health", perm: "view", render: renderCameras, live: true },
  { id: "batteries", title: "Battery health", perm: "view", render: renderBatteries, live: true },
  { id: "nvrs", title: "NVR status", perm: "view", render: renderNvrs, live: true },
  { id: "alerts", title: "Health alerts", perm: "view", render: renderAlerts, sep: "Respond", live: true },
  { id: "events", title: "AI events", perm: "view", render: renderEvents, live: true },
  { id: "approvals", title: "Approvals", perm: "view", render: renderApprovals },
  { id: "notifications", title: "Notification log", perm: "view", render: renderNotifications },
  { id: "usecases", title: "Use cases", perm: "view", render: renderUseCases, sep: "AI use cases" },
  { id: "capabilities", title: "Models & integrations", perm: "view", render: renderCapabilities },
  { id: "devices", title: "Manage devices", perm: "manage_devices", render: renderDevices, sep: "Manage" },
  { id: "locations", title: "Locations", perm: "view", render: renderLocations },
  { id: "contacts", title: "Alert contacts", perm: "view", render: renderContacts },
  { id: "users", title: "Users & access", perm: "manage_users", render: renderUsers },
  { id: "orgs", title: "Organizations", perm: "manage_orgs", render: renderOrgs },
  { id: "rules", title: "Alert rules", perm: "manage_rules", render: renderRules },
  { id: "edge", title: "Edge devices", perm: "manage_edge", render: renderEdge },
  { id: "audit", title: "Audit log", perm: "view_audit", render: renderAudit },
];

function renderNav() {
  $("#nav").innerHTML = ROUTES.filter((r) => can(r.perm)).map((r) =>
    `${r.sep ? `<div class="sep">${r.sep}</div>` : ""}<a href="#/${r.id}" data-id="${r.id}">${r.title}${r.id === "approvals" ? ' <span class="badge warn nav-count" id="apprCount" hidden></span>' : ""}</a>`).join("");
  const me = state.me;
  const scope = me.role === "super_admin" ? "All organizations"
    : ["org_admin", "auditor"].includes(me.role) ? `${me.org || ""} (all locations)`
    : me.locations.map((s) => s.path).join(", ") || "No locations assigned";
  $("#whoami").innerHTML = `<strong>${esc(me.full_name || me.username)}</strong>${me.designation ? `<br>${esc(me.designation)}` : ""}<br>${esc(me.role.replace("_", " "))} · ${esc(scope)}`;
}

async function refreshApprovalCount() {
  try {
    const list = await api("/api/approvals?status=pending");
    const n = list.filter((x) => x.can_decide).length;
    const el = $("#apprCount");
    if (el) { el.textContent = n; el.hidden = n === 0; }
  } catch { /* ignore */ }
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
  if (r.live) {
    state.timer = setInterval(() => { if (state.route === r.id && $("#drawer").hidden && !document.activeElement?.matches("input,select,textarea")) run(); }, 30000);
  }
}

async function boot() {
  try {
    state.me = await api("/api/auth/me");
  } catch {
    return renderLogin();
  }
  await refreshLocations();
  $("#sidebar").hidden = false;
  $("#topbar").hidden = false;
  renderNav();
  refreshApprovalCount();
  route();
}

// --------------------------------------------------------------- overview --
const ovFilter = { location_id: "" };
async function renderOverview() {
  const lq = ovFilter.location_id ? `location_id=${ovFilter.location_id}` : "";
  const [s, trend, worst, evs, alerts] = await Promise.all([
    api(`/api/health/summary?${lq}`), api("/api/health/trend?hours=24"), api("/api/health/worst?hours=24&limit=8"),
    api("/api/events/stats?days=7"), api(`/api/alerts?status=active&limit=8&${lq}`),
  ]);
  $("#simBadge").hidden = !s.simulated;
  const c = s.cameras, n = s.nvrs, b = s.battery, st = s.storage;
  const kpi = (label, value, sub = "", cls = "") => `<div class="card kpi ${cls}"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
  const issues = Object.entries(c.image_issues || {});
  view.innerHTML = `
  <div class="toolbar"><label class="small muted" for="ovLoc">Showing</label><select id="ovLoc">${locOptions(ovFilter.location_id)}</select></div>
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
  <div class="card"><h2>By branch / office</h2>${s.locations.length ? `<div class="table-wrap"><table><thead><tr><th>Branch / office</th><th class="num">Cameras</th><th class="num">Online</th><th class="num">NVRs</th><th class="num">NVR faults</th></tr></thead><tbody>
      ${s.locations.map((x) => `<tr><td>${esc(x.name)}</td><td class="num">${x.cameras}</td><td class="num">${x.online_pct ?? "—"}${x.online_pct != null ? "%" : ""}</td><td class="num">${x.nvrs}</td><td class="num">${x.nvr_faults ? `<span class="badge bad">${x.nvr_faults}</span>` : "0"}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No devices yet.</div>'}</div>
  <div class="grid cols-3">
    <div class="card"><h2>Least reliable cameras (24 h)</h2>${hbars(worst.map((w) => ({ label: `${w.name} · ${w.location}`, value: w.uptime_pct, text: `${w.uptime_pct}%`, cls: w.uptime_pct < 80 ? "bar-bad" : "bar-warn" })), { max: 100 })}</div>
    <div class="card"><h2>Image &amp; stream issues now</h2>${hbars(issues.map(([k, v]) => ({ label: k.replace("_", " "), value: v, cls: "bar-warn" })))}</div>
    <div class="card"><h2>AI events by category (7 days) <a class="right small" href="#/usecases">Use cases</a></h2>${hbars(Object.entries(evs.by_category || {}).sort((a, b2) => b2[1] - a[1]).slice(0, 8).map(([k, v]) => ({ label: k, value: v })))}</div>
  </div>`;
  $("#ovLoc").onchange = (e) => { ovFilter.location_id = e.target.value; renderOverview(); };
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
const camFilters = { location_id: "", status: "", power_type: "", q: "" };
const IMG_FLAGS = ["blurred", "blank", "frozen", "too_dark", "too_bright", "view_changed"];
async function renderCameras() {
  const qs = new URLSearchParams(Object.entries(camFilters).filter(([, v]) => v)).toString();
  const cams = await api(`/api/cameras?${qs}`);
  $("#simBadge").hidden = !cams.some((c) => c.health.data.source === "simulator");
  view.innerHTML = `
  <div class="toolbar">
    <input class="grow" id="fq" placeholder="Search name, zone or IP" value="${esc(camFilters.q)}">
    <select id="floc">${locOptions(camFilters.location_id)}</select>
    <select id="fstatus"><option value="">Any status</option>${["online", "offline", "unknown"].map((s) => `<option ${camFilters.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    <select id="fpower"><option value="">Any power</option>${["poe", "mains", "battery", "solar"].map((s) => `<option ${camFilters.power_type === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    <button class="btn" id="exportCsv">Export CSV</button>
  </div>
  <div class="card"><div class="muted small">${cams.length} cameras · click a row for details, troubleshooting and history</div>
  <div class="table-wrap"><table><thead><tr><th>Camera</th><th>Location</th><th>Make / model</th><th>Serial no.</th><th>Status</th><th class="num">FPS</th><th class="num">Bitrate</th><th>Image</th><th>Power</th></tr></thead><tbody>
  ${cams.map((c) => { const d = c.health.data; const fl = IMG_FLAGS.filter((f) => d[f]); const lowFps = d.fps != null && d.fps < 0.6 * c.target_fps; return `<tr class="clickable" data-cam="${c.id}">
    <td><strong>${esc(c.name)}</strong><div class="muted small">${esc(c.nvr ? `${c.nvr} · CH${c.channel}` : c.host)}${c.department ? ` · ${esc(c.department)}` : ""}</div></td>
    <td class="wrap">${locCell(c, c.zone ? ` · ${esc(c.zone)}` : "")}</td>
    <td>${makeModel(c)}</td><td class="small">${c.serial_number ? esc(c.serial_number) : '<span class="na">—</span>'}</td>
    <td>${c.enabled ? statusBadge(c.health.status) : activeBadge(false)}<div class="muted small">${c.health.status === "offline" && c.health.error ? `<span class="errline">${esc(c.health.error.slice(0, 60))}</span>` : `seen ${ago(c.health.last_seen)}`}</div></td>
    <td class="num">${d.fps != null ? `<span class="${lowFps ? "badge warn" : ""}">${d.fps}</span><span class="muted small">/${c.target_fps}</span>` : NA}</td>
    <td class="num">${d.bitrate_kbps != null ? `${Math.round(d.bitrate_kbps)} kbps` : NA}</td>
    <td>${c.health.status !== "online" ? "—" : fl.length ? fl.map((f) => `<span class="badge warn">${f.replace("_", " ")}</span>`).join(" ") : d.sharpness != null ? '<span class="badge ok">OK</span>' : NA}</td>
    <td>${c.power_type === "battery" || c.power_type === "solar" ? (d.battery_pct != null ? `${d.battery_pct}%` : NA) : esc(c.power_type.toUpperCase())}</td></tr>`; }).join("") || '<tr><td colspan="9" class="empty">No cameras match.</td></tr>'}
  </tbody></table></div></div>`;
  const reload = () => renderCameras();
  $("#fq").onchange = (e) => { camFilters.q = e.target.value; reload(); };
  $("#floc").onchange = (e) => { camFilters.location_id = e.target.value; reload(); };
  $("#fstatus").onchange = (e) => { camFilters.status = e.target.value; reload(); };
  $("#fpower").onchange = (e) => { camFilters.power_type = e.target.value; reload(); };
  $("#exportCsv").onclick = async () => download("cameras.csv", await api("/api/cameras/export.csv"));
  $$("[data-cam]").forEach((tr) => (tr.onclick = () => deviceDetail("camera", tr.dataset.cam)));
}

// ---------------------------------------------------- device detail drawer --
function deviceActions(kind, d) {
  const b = [];
  b.push(`<button class="btn small" data-act="check">Check now</button>`);
  if (can("troubleshoot")) b.push(`<button class="btn small" data-act="troubleshoot">Troubleshoot</button>`);
  if (can("reboot")) b.push(`<button class="btn small danger" data-act="reboot">Reboot ${kind === "nvr" ? "NVR" : "camera"}</button>`);
  if (can("manage_devices")) {
    b.push(`<button class="btn small" data-act="edit">Edit</button>`);
    b.push(`<button class="btn small" data-act="toggle">${d.enabled ? "Deactivate" : "Activate"}</button>`);
  }
  return b.join("");
}

function bindDeviceActions(kind, d, root, reopen) {
  const path = `/api/${kind}s/${d.id}`;
  $$("[data-act]", root).forEach((btn) => (btn.onclick = async () => {
    const act = btn.dataset.act;
    if (act === "edit") return kind === "camera" ? cameraForm(d) : nvrForm(d);
    if (act === "reboot") return confirmBox(root, `Reboot ${esc(d.name)}?`,
      `The ${kind === "nvr" ? "NVR stops recording and all its cameras go offline" : "camera stops streaming"} for about 1–3 minutes.`,
      "Reboot now", async () => {
        try { const r = await api(`${path}/reboot`, { method: "POST" }); toast(`Reboot sent (${r.method}): ${r.message}`); }
        catch (e) { toast(e.message); }
      });
    btn.disabled = true;
    const label = btn.textContent;
    try {
      if (act === "check") { btn.textContent = "Checking…"; await api(`${path}/check`, { method: "POST" }); reopen(); }
      if (act === "troubleshoot") {
        btn.textContent = "Running checks…";
        const r = await api(`${path}/troubleshoot`, { method: "POST" });
        $("#tsResult", root).innerHTML = troubleshootHtml(r);
        $("#tsResult", root).scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (act === "toggle") {
        const r = await api(`${path}/enabled`, { method: "POST", json: { enabled: !d.enabled } });
        if (changed(r, d.enabled ? "Deactivated" : "Activated")) reopen();
      }
    } catch (e) { toast(e.message); }
    btn.disabled = false;
    btn.textContent = label;
  }));
}

function confirmBox(root, title, text, okLabel, onOk) {
  const box = $("#confirmBox", root);
  box.innerHTML = `<div class="card confirm"><strong>${title}</strong><p class="muted">${esc(text)}</p>
    <div class="toolbar"><button class="btn danger" id="cbOk">${esc(okLabel)}</button><button class="btn" id="cbNo">Cancel</button></div></div>`;
  $("#cbNo", box).onclick = () => (box.innerHTML = "");
  $("#cbOk", box).onclick = async () => { box.innerHTML = ""; await onOk(); };
}

function troubleshootHtml(r) {
  const icon = { pass: "✓", warn: "!", fail: "✕", skip: "–" };
  const head = { pass: '<span class="badge ok">All checks passed</span>', warn: '<span class="badge warn">Working, with warnings</span>', fail: '<span class="badge bad">Problem found</span>' }[r.result];
  return `<div class="card"><h2>Troubleshooting result <span class="right">${head}</span></h2><ol class="steps">${r.steps.map((s) => `
    <li class="step ${s.status}"><span class="step-icon" aria-label="${s.status}">${icon[s.status]}</span><div class="main-col">
    <div class="title">${esc(s.name)}${s.ms != null ? ` <span class="muted small">${s.ms} ms</span>` : ""}</div><div class="small">${esc(s.detail)}</div>
    ${s.hint ? `<div class="hint small">What to do: ${esc(s.hint)}</div>` : ""}</div></li>`).join("")}</ol></div>`;
}

function identityCard(kind, d) {
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const loc = locById(d.location_id);
  const branch = loc ? branchOf(loc) : null;
  return `<div class="card"><h2>Device details</h2><dl class="kv">
    ${row("Make", d.manufacturer ? esc(d.manufacturer) : esc(d.vendor) + ' <span class="muted small">(configured)</span>')}
    ${row("Model", d.model ? esc(d.model) : '<span class="na">Not detected yet</span>')}
    ${row("Serial number", d.serial_number ? esc(d.serial_number) : '<span class="na">Not detected yet</span>')}
    ${row("Firmware", d.firmware ? esc(d.firmware) : '<span class="na">Not detected yet</span>')}
    ${row("MAC address", d.mac_address ? esc(d.mac_address) : '<span class="na">—</span>')}
    ${row("Organization", esc(d.org))}
    ${row("Branch / office", branch ? esc(branch.name) : "—")}
    ${row("Location", esc(d.location_path))}
    ${kind === "camera" ? row("Spot", esc([d.building, d.floor && `Floor ${d.floor}`, d.zone].filter(Boolean).join(" · ") || "—")) : ""}
    ${row("Department", d.department ? esc(d.department) : "—")}
    ${kind === "camera" ? row("NVR", d.nvr ? `${esc(d.nvr)} · channel ${d.channel}` : "Standalone (no NVR)") : row("Channels used", `${d.camera_count} of ${d.channels}`)}
    ${row("IP address", esc(d.host || "—"))}
    ${row("Health driver", esc(d.driver))}
    ${row("Details read from device", d.info_updated_at ? ago(d.info_updated_at) : "never")}
  </dl></div>`;
}

function branchOf(loc) {
  const BR = ["branch", "office", "warehouse", "store", "plant", "corporate"];
  let cur = loc;
  while (cur) {
    if (BR.includes(cur.kind)) return cur;
    cur = cur.parent_id ? locById(cur.parent_id) : null;
  }
  return loc;
}

function statusCard(d) {
  const h = d.health;
  return `<div class="card status-card ${!d.enabled ? "" : h.status}"><div class="toolbar">${activeBadge(d.enabled)} ${d.enabled ? statusBadge(h.status) : ""}
    <span class="muted small">checked ${ago(h.last_checked)} · last seen ${ago(h.last_seen)}</span>
    ${h.data.source === "simulator" ? '<span class="badge warn">SIMULATED</span>' : ""}</div>
    ${h.error ? `<div class="errbox"><strong>Error:</strong> ${esc(h.error)}</div>` : ""}
    ${!d.enabled ? '<div class="muted small">Deactivated devices are not checked and raise no alerts.</div>' : ""}</div>`;
}

async function deviceDetail(kind, id, hours = 24) {
  if (kind === "nvr") return nvrDetail(id);
  const c = await api(`/api/cameras/${id}`);
  const battery = c.power_type === "battery" || c.power_type === "solar";
  const keys = ["online", "fps", "latency_ms"].concat(battery ? ["battery_pct"] : []);
  const m = await api(`/api/metrics/camera/${id}?hours=${hours}&keys=${keys.join(",")}`);
  const d = c.health.data;
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  openDrawer(`<h2>${esc(c.name)}</h2>
    <div class="toolbar">${deviceActions("camera", c)}</div><div id="confirmBox"></div>
    ${statusCard(c)}
    <div id="tsResult"></div>
    ${identityCard("camera", c)}
    ${cameraUseCasesCard(c)}
    <div class="card"><h2>Stream</h2><dl class="kv">
      ${row("Measured FPS", d.fps != null ? `${d.fps} of ${c.target_fps} target` : NA)}${row("Bitrate", fmt(d.bitrate_kbps, " kbps", 0))}
      ${row("Resolution", d.width ? `${d.width}×${d.height}` : NA)}${row("Codec", d.codec ? esc(d.codec.toUpperCase()) : NA)}
      ${row("RTSP latency", fmt(d.latency_ms, " ms"))}${row("Packet loss", fmt(d.packet_loss_pct, "%", 2))}
      ${row("Clock drift", fmt(d.time_drift_s, " s"))}</dl></div>
    <div class="card"><h2>Picture health</h2><dl class="kv">
      ${row("Brightness (0–255)", fmt(d.brightness))}${row("Contrast", fmt(d.contrast))}${row("Sharpness", fmt(d.sharpness))}
      ${row("Flags", IMG_FLAGS.filter((f) => f in d).map((f) => `<span class="badge ${d[f] ? "warn" : "ok"}">${f.replace("_", " ")}: ${d[f] ? "yes" : "no"}</span>`).join(" ") || NA)}</dl></div>
    ${battery ? `<div class="card"><h2>Battery &amp; power</h2><dl class="kv">
      ${row("Charge", d.battery_pct != null ? `${d.battery_pct}% ${meter(d.battery_pct)}` : NA)}${row("Voltage", fmt(d.battery_voltage, " V", 2))}
      ${row("Charging", d.charging == null ? NA : d.charging ? "Yes" : "No")}${row("Temperature", fmt(d.battery_temp_c, " °C"))}
      ${row("Est. time left", fmt(d.est_hours_left, " h"))}${row("Solar input", c.power_type === "solar" ? fmt(d.solar_w, " W") : "—")}
      ${row("Signal", fmt(d.signal_dbm, " dBm", 0))}</dl></div>` : ""}
    <div class="card"><h2>History <select id="dHours" class="right">${[1, 6, 24, 168, 720].map((h) => `<option value="${h}" ${h === hours ? "selected" : ""}>${h < 48 ? `${h} h` : `${h / 24} days`}</option>`).join("")}</select></h2>
      <div class="small muted">Online</div>${lineChart([{ points: m.online }], { yMax: 1, height: 80, step: true })}
      <div class="small muted">FPS</div>${lineChart([{ points: m.fps }], { yMax: Math.max(c.target_fps, 1), height: 120 })}
      ${battery ? `<div class="small muted">Battery %</div>${lineChart([{ points: m.battery_pct }], { yMax: 100, unit: "%", height: 120 })}` : ""}</div>`);
  $("#dHours").onchange = (e) => deviceDetail("camera", id, +e.target.value);
  bindDeviceActions("camera", c, $("#drawerBody"), () => deviceDetail("camera", id, hours));
  bindCameraUseCases(c);
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
  <div class="card"><h2>Battery health <span class="right muted small">lowest first · "Not supported" = the device does not report it</span></h2>
  <div class="table-wrap"><table><thead><tr><th>Camera</th><th>Location</th><th>Status</th><th>Charge</th><th></th><th class="num">Voltage</th><th>Charging</th><th class="num">Temp</th><th class="num">Time left</th><th class="num">Solar</th><th class="num">Signal</th></tr></thead><tbody>
  ${cams.map((c) => { const d = c.health.data; return `<tr class="clickable" data-cam="${c.id}"><td><strong>${esc(c.name)}</strong><div class="muted small">${esc(c.power_type)}</div></td><td class="wrap">${locCell(c)}</td><td>${statusBadge(c.health.status)}</td>
    <td class="num">${d.battery_pct != null ? `${d.battery_pct}%` : NA}</td><td>${d.battery_pct != null ? meter(d.battery_pct) : ""}</td>
    <td class="num">${fmt(d.battery_voltage, " V", 2)}</td><td>${d.charging == null ? NA : d.charging ? '<span class="badge ok">yes</span>' : "no"}</td>
    <td class="num">${fmt(d.battery_temp_c, " °C")}</td><td class="num">${fmt(d.est_hours_left, " h", 0)}</td>
    <td class="num">${c.power_type === "solar" ? fmt(d.solar_w, " W") : "—"}</td><td class="num">${fmt(d.signal_dbm, " dBm", 0)}</td></tr>`; }).join("") || '<tr><td colspan="11" class="empty">No battery or solar cameras.</td></tr>'}
  </tbody></table></div></div>`;
  $$("[data-cam]").forEach((tr) => (tr.onclick = () => deviceDetail("camera", tr.dataset.cam)));
}

// ------------------------------------------------------------------ NVRs ---
async function renderNvrs() {
  const nvrs = await api("/api/nvrs");
  view.innerHTML = `<div class="card"><h2>NVR / DVR status</h2><div class="table-wrap"><table><thead><tr>
    <th>NVR</th><th>Location</th><th>Make / model</th><th>Serial no.</th><th>Status</th><th class="num">Cameras</th><th>Recording</th><th>Disks</th><th>Storage</th><th class="num">Retention</th><th class="num">Temp</th></tr></thead><tbody>
  ${nvrs.map((n) => { const d = n.health.data; const used = d.storage_used_pct; return `<tr class="clickable" data-nvr="${n.id}">
    <td><strong>${esc(n.name)}</strong><div class="muted small">${esc(n.host)}${n.department ? ` · ${esc(n.department)}` : ""}</div></td><td class="wrap">${locCell(n)}</td>
    <td>${makeModel(n)}</td><td class="small">${n.serial_number ? esc(n.serial_number) : '<span class="na">—</span>'}</td>
    <td>${n.enabled ? statusBadge(n.health.status) : activeBadge(false)}<div class="muted small">${n.health.status === "offline" && n.health.error ? `<span class="errline">${esc(n.health.error.slice(0, 60))}</span>` : `seen ${ago(n.health.last_seen)}`}</div></td>
    <td class="num">${n.camera_count}/${n.channels}</td>
    <td>${d.recording_channels != null ? `<span class="badge ${d.recording_channels < d.total_channels ? "warn" : "ok"}">${d.recording_channels}/${d.total_channels} ch</span>` : NA}</td>
    <td>${d.disk_count != null ? (d.disk_errors ? `<span class="badge bad">${d.disk_errors} error / ${d.disk_count}</span>` : `<span class="badge ok">${d.disk_count} OK</span>`) : NA}</td>
    <td class="num">${used != null ? `${used}% ${meter(used, used > 95 ? "bar-bad" : used > 85 ? "bar-warn" : "bar-ok")}` : NA}</td>
    <td class="num">${d.retention_days != null ? `<span class="${d.retention_days < 7 ? "badge warn" : ""}">${d.retention_days} d</span>` : NA}</td>
    <td class="num">${fmt(d.temp_c, " °C")}</td></tr>`; }).join("") || '<tr><td colspan="11" class="empty">No NVRs added.</td></tr>'}
  </tbody></table></div></div>`;
  $$("[data-nvr]").forEach((tr) => (tr.onclick = () => nvrDetail(tr.dataset.nvr)));
}

async function nvrDetail(id) {
  const [n, m, cams] = await Promise.all([api(`/api/nvrs/${id}`), api(`/api/metrics/nvr/${id}?hours=168&keys=storage_used_pct,temp_c`), api(`/api/cameras?nvr_id=${id}`)]);
  const d = n.health.data;
  openDrawer(`<h2>${esc(n.name)}</h2><div class="toolbar">${deviceActions("nvr", n)}</div><div id="confirmBox"></div>
    ${statusCard(n)}<div id="tsResult"></div>${identityCard("nvr", n)}
    <div class="card"><h2>Disks</h2>${d.disks ? `<table><thead><tr><th>Disk</th><th>Status</th><th class="num">Capacity</th><th class="num">Free</th></tr></thead><tbody>${d.disks.map((k) => `<tr><td>HDD ${esc(k.id)}</td><td><span class="badge ${k.status === "ok" ? "ok" : "bad"}">${esc(k.status)}</span></td><td class="num">${fmt(k.capacity_gb, " GB", 0)}</td><td class="num">${fmt(k.free_gb, " GB", 0)}</td></tr>`).join("")}</tbody></table>` : `<div class="muted">${NA}. The hikvision_isapi driver reads disk status.</div>`}</div>
    <div class="card"><h2>Storage used, 7 days</h2>${lineChart([{ points: m.storage_used_pct }], { yMax: 100, unit: "%", height: 120 })}</div>
    <div class="card"><h2>Channels (${cams.length})</h2><div class="list">${cams.map((c) => `<div class="list-item clickable" data-cam="${c.id}">${c.enabled ? statusBadge(c.health.status) : activeBadge(false)}<div class="main-col"><div class="title">CH${c.channel} · ${esc(c.name)}</div><div class="muted small">${makeModel(c)}${c.serial_number ? ` · SN ${esc(c.serial_number)}` : ""}</div></div></div>`).join("") || '<div class="empty">No channels imported.</div>'}</div></div>`);
  $$("#drawerBody [data-cam]").forEach((el) => (el.onclick = () => deviceDetail("camera", el.dataset.cam)));
  bindDeviceActions("nvr", n, $("#drawerBody"), () => nvrDetail(id));
}

// ---------------------------------------------------------------- alerts ---
const alertFilters = { status: "active", severity: "", location_id: "" };
async function renderAlerts() {
  const qs = new URLSearchParams(Object.entries(alertFilters).filter(([, v]) => v)).toString();
  const alerts = await api(`/api/alerts?${qs}`);
  view.innerHTML = `<div class="toolbar">
    <select id="aStatus">${["active", "open", "acknowledged", "resolved", "all"].map((s) => `<option ${alertFilters.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    <select id="aSev"><option value="">Any severity</option>${["critical", "warning", "info"].map((s) => `<option ${alertFilters.severity === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    <select id="aLoc">${locOptions(alertFilters.location_id)}</select></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Severity</th><th>Alert</th><th>Device</th><th>Opened</th><th>Status</th><th></th></tr></thead><tbody>
  ${alerts.map((a) => `<tr><td>${sevBadge(a.severity)}</td><td class="wrap">${esc(a.message)}<div class="muted small">${esc(locById(a.location_id)?.path || "")}</div></td><td>${esc(a.device_type)}</td><td class="small">${localTime(a.opened_at)}</td>
    <td>${esc(a.status)}${a.acknowledged_by ? `<div class="muted small">by ${esc(a.acknowledged_by)}</div>` : ""}${a.resolved_at ? `<div class="muted small">resolved ${ago(a.resolved_at)}</div>` : ""}</td>
    <td>${a.status === "open" && can("ack") ? `<button class="btn small" data-ack="${a.id}">Acknowledge</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="6" class="empty">No alerts.</td></tr>'}
  </tbody></table></div><div class="muted small">Alert contacts for each location are notified automatically. See <a href="#/contacts">Alert contacts</a> and the <a href="#/notifications">Notification log</a>.</div></div>`;
  $("#aStatus").onchange = (e) => { alertFilters.status = e.target.value; renderAlerts(); };
  $("#aSev").onchange = (e) => { alertFilters.severity = e.target.value; renderAlerts(); };
  $("#aLoc").onchange = (e) => { alertFilters.location_id = e.target.value; renderAlerts(); };
  bindAlertAcks(view);
}

// ---------------------------------------------------------------- events ---
const evFilters = { status: "new", type: "", location_id: "" };
async function renderEvents() {
  const qs = new URLSearchParams(Object.entries(evFilters).filter(([, v]) => v)).toString();
  const [events, stats] = await Promise.all([api(`/api/events?${qs}`), api("/api/events/stats?days=7")]);
  const types = Object.keys(stats.by_type).sort();
  view.innerHTML = `<div class="toolbar">
    <select id="eStatus"><option value="">Any status</option>${["new", "acknowledged", "true_alarm", "false_alarm"].map((s) => `<option value="${s}" ${evFilters.status === s ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}</select>
    <select id="eType"><option value="">Any type</option>${types.map((t) => `<option value="${esc(t)}" ${evFilters.type === t ? "selected" : ""}>${esc(stats.by_type[t]?.name || t)}</option>`).join("")}</select>
    <select id="eLoc">${locOptions(evFilters.location_id)}</select>
    <span class="grow"></span><span class="muted small">False-alarm rate (7 d): <strong>${stats.false_alarm_pct ?? "—"}${stats.false_alarm_pct != null ? "%" : ""}</strong> of ${stats.reviewed} reviewed</span></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Time</th><th>Event</th><th>Camera</th><th>Zone</th><th class="num">Confidence</th><th>Source</th><th>Status</th><th></th></tr></thead><tbody>
  ${events.map((e) => `<tr><td class="small">${localTime(e.ts)}</td><td class="wrap"><strong>${esc(stats.by_type[e.type]?.name || e.type.replaceAll("_", " "))}</strong><div class="muted small">${esc(stats.by_type[e.type]?.category || "")}${e.object_class ? ` · ${esc(e.object_class)}` : ""}</div></td>
    <td>${esc(e.camera)}<div class="muted small">${esc(locById(e.location_id)?.path || e.location)}</div></td><td>${esc(e.zone)}</td><td class="num">${(e.confidence * 100).toFixed(0)}%</td>
    <td><span class="badge neutral">${esc(e.source)}</span></td><td>${evStatusBadge(e.status)}</td>
    <td>${can("ack") ? `<button class="btn small" data-ev="${e.id}" data-st="true_alarm">True</button> <button class="btn small" data-ev="${e.id}" data-st="false_alarm">False</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="8" class="empty">No events.</td></tr>'}
  </tbody></table></div></div>`;
  $("#eStatus").onchange = (e) => { evFilters.status = e.target.value; renderEvents(); };
  $("#eType").onchange = (e) => { evFilters.type = e.target.value; renderEvents(); };
  $("#eLoc").onchange = (e) => { evFilters.location_id = e.target.value; renderEvents(); };
  $$("[data-ev]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try { await api(`/api/events/${b.dataset.ev}/handle`, { method: "POST", json: { status: b.dataset.st } }); renderEvents(); } catch (e) { toast(e.message); b.disabled = false; }
  }));
}

// ------------------------------------------------------------- approvals ---
let apprStatus = "pending";
async function renderApprovals() {
  const list = await api(`/api/approvals?status=${apprStatus}`);
  const st = (s) => `<span class="badge ${{ pending: "warn", approved: "ok", rejected: "neutral", failed: "bad" }[s]}">${s}</span>`;
  view.innerHTML = `<div class="toolbar"><select id="apStatus">${["pending", "approved", "rejected", "failed", "all"].map((s) => `<option ${s === apprStatus ? "selected" : ""}>${s}</option>`).join("")}</select>
    <span class="muted small grow">When an organization requires approval, device changes by location admins wait here until someone above them approves.</span></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Requested</th><th>Change</th><th>Location</th><th>By</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.map((r) => `<tr><td class="small">${localTime(r.requested_at)}</td><td class="wrap"><strong>${esc(r.summary)}</strong><div class="muted small">${esc(r.entity)} · ${esc(r.action)}</div></td>
      <td class="wrap">${esc(r.location_path)}</td><td>${esc(r.requested_by)}</td>
      <td>${st(r.status)}${r.decided_by ? `<div class="muted small">${esc(r.decided_by)} · ${ago(r.decided_at)}${r.decision_note ? ` · “${esc(r.decision_note)}”` : ""}</div>` : ""}${r.status === "failed" ? `<div class="errline small">${esc(JSON.stringify(r.result.error))}</div>` : ""}</td>
      <td>${r.can_decide ? `<div class="actions"><input placeholder="Note (optional)" data-note="${r.id}" size="14"><button class="btn small primary" data-dec="${r.id}" data-ok="1">Approve</button><button class="btn small danger" data-dec="${r.id}" data-ok="0">Reject</button></div>` : ""}</td></tr>`).join("") || '<tr><td colspan="6" class="empty">Nothing here.</td></tr>'}
    </tbody></table></div></div>`;
  $("#apStatus").onchange = (e) => { apprStatus = e.target.value; renderApprovals(); };
  $$("[data-dec]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try {
      const r = await api(`/api/approvals/${b.dataset.dec}/decide`, { method: "POST", json: { approve: b.dataset.ok === "1", note: $(`[data-note="${b.dataset.dec}"]`).value } });
      toast(r.status === "approved" ? "Approved and applied" : r.status === "rejected" ? "Rejected" : `Could not apply: ${JSON.stringify(r.result.error)}`);
      refreshApprovalCount(); renderApprovals();
    } catch (e) { toast(e.message); b.disabled = false; }
  }));
}

// --------------------------------------------------------- notifications ---
async function renderNotifications() {
  const rows = await api("/api/notifications");
  view.innerHTML = `<div class="card"><h2>Notifications sent to alert contacts</h2><div class="table-wrap"><table><thead><tr><th>Time</th><th>Contact</th><th>Channel</th><th>Sent to</th><th>Result</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td class="small">${localTime(r.ts)}</td><td>${esc(r.contact)}<div class="muted small">${esc(r.designation)}</div></td><td>${esc(r.channel.toUpperCase())}</td><td>${esc(r.target)}</td>
      <td><span class="badge ${r.status === "sent" ? "ok" : r.status === "skipped" ? "neutral" : "bad"}">${esc(r.status)}</span>${r.error ? `<div class="muted small wrap">${esc(r.error)}</div>` : ""}</td></tr>`).join("") || '<tr><td colspan="5" class="empty">No notifications yet.</td></tr>'}
    </tbody></table></div><div class="muted small">“skipped” means email (SC_SMTP_HOST) or SMS (SC_SMS_URL) is not configured on the server yet.</div></div>`;
}

// ---------------------------------------------------------- manage devices --
let devTab = "cameras";
async function renderDevices(tab = devTab) {
  devTab = tab;
  const tabs = [["cameras", "Cameras"], ["nvrs", "NVRs"], ["csv", "Bulk CSV import"], ["channels", "Import NVR channels"], ["discover", "ONVIF discovery"]];
  view.innerHTML = `<div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? "active" : ""}">${l}</button>`).join("")}</div><div id="devBody"><div class="muted">Loading…</div></div>`;
  $$("[data-tab]").forEach((b) => (b.onclick = () => renderDevices(b.dataset.tab)));
  const body = $("#devBody");
  if (tab === "cameras" || tab === "nvrs") return deviceTable(tab, body);
  const info = await api("/api/system/info");
  if (tab === "csv") {
    body.innerHTML = `<div class="card"><p class="muted">Paste CSV or choose a file. The <code>location</code> column takes a location code, a full path (for example <code>Corporate Office / West Region / Mumbai Branch</code>) or a name that is unique. Every row is checked first; nothing is imported unless all rows are valid.</p>
      <div class="toolbar"><button class="btn" id="tplBtn">Download template</button><input type="file" id="csvFile" accept=".csv,text/csv"></div>
      <textarea id="csvText" placeholder="name,location,host,rtsp_url,…"></textarea>
      <div class="toolbar"><button class="btn" id="csvCheck">Validate</button><button class="btn primary" id="csvImport">Import</button></div><div id="csvResult"></div></div>`;
    $("#tplBtn").onclick = async () => download("camera_import_template.csv", await api("/api/cameras/import/template"));
    $("#csvFile").onchange = async (e) => { $("#csvText").value = await e.target.files[0].text(); };
    const send = async (dry) => {
      try {
        const r = await api(`/api/cameras/import?dry_run=${dry}`, { method: "POST", body: $("#csvText").value, headers: { "Content-Type": "text/csv" } });
        if (r.pending_approval) { changed(r); $("#csvResult").innerHTML = `<p><span class="badge warn">Sent for approval</span> request #${r.request_id}</p>`; return; }
        $("#csvResult").innerHTML = r.errors.length
          ? `<p class="err">${r.errors.length} row(s) have errors — nothing imported.</p><table><tbody>${r.errors.map((x) => `<tr><td>Row ${x.row}</td><td class="wrap">${esc(x.error)}</td></tr>`).join("")}</tbody></table>`
          : dry ? `<p><span class="badge ok">${r.valid_rows} rows valid</span> Ready to import.</p>` : `<p><span class="badge ok">${r.imported} cameras imported</span></p>`;
      } catch (er) { toast(er.message); }
    };
    $("#csvCheck").onclick = () => send(true);
    $("#csvImport").onclick = () => send(false);
  }
  if (tab === "channels") {
    const nvrs = await api("/api/nvrs");
    body.innerHTML = `<form id="chForm" class="card"><p class="muted">Creates one camera per NVR channel using the vendor's RTSP path (Hikvision, Dahua, CP Plus built in) or your own template with {host}, {port}, {ch}.</p><div class="form-grid">
      <label class="field">NVR<select name="nvr">${nvrs.map((n) => `<option value="${n.id}">${esc(n.name)} — ${esc(n.location_path)} (${n.camera_count}/${n.channels})</option>`).join("")}</select></label>
      <label class="field">Channels (blank = all)<input name="channels" placeholder="1-8,10"></label>
      <label class="field">Camera health driver<select name="driver">${info.camera_drivers.map((v) => `<option ${v === "generic" ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="field">Main template (optional)<input name="main_template" placeholder="rtsp://{host}:{port}/…{ch}…"></label>
      <label class="field">Sub template (optional)<input name="sub_template"></label></div>
      <div class="toolbar"><button class="btn primary" type="submit" ${nvrs.length ? "" : "disabled"}>Import channels</button></div><div id="chResult"></div></form>`;
    $("#chForm").onsubmit = async (e) => {
      e.preventDefault();
      const o = Object.fromEntries(new FormData(e.target));
      const chans = [];
      for (const part of (o.channels || "").split(",").map((s) => s.trim()).filter(Boolean)) {
        const [a, b] = part.split("-").map(Number);
        for (let i = a; i <= (b || a); i++) chans.push(i);
      }
      try {
        const r = await api(`/api/nvrs/${o.nvr}/import-channels`, { method: "POST", json: { channels: chans.length ? chans : null, driver: o.driver, main_template: o.main_template, sub_template: o.sub_template } });
        if (changed(r, `${r.created} cameras created`)) $("#chResult").innerHTML = `<p><span class="badge ok">${r.created} cameras created</span> (existing channels were skipped)</p>`;
      } catch (er) { toast(er.message); }
    };
  }
  if (tab === "discover") {
    body.innerHTML = `<div class="card"><p class="muted">Sends an ONVIF WS-Discovery probe on the server's local network. Multicast does not cross routers: run it per VLAN, or use CSV import.</p>
      <div class="toolbar"><input id="dIface" placeholder="Interface IP (optional)"><button class="btn primary" id="dRun">Discover cameras</button></div><div id="dResult"></div></div>`;
    $("#dRun").onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = "Searching…";
      try {
        const r = await api(`/api/discovery?iface_ip=${encodeURIComponent($("#dIface").value)}`, { method: "POST" });
        $("#dResult").innerHTML = r.length ? `<table><thead><tr><th>Host</th><th>Name</th><th>Hardware</th><th></th></tr></thead><tbody>${r.map((d) => `<tr><td>${esc(d.host)}:${d.onvif_port}</td><td>${esc(d.name || "")}</td><td>${esc(d.hardware || "")}</td><td>${d.already_added ? '<span class="badge neutral">added</span>' : `<button class="btn small" data-add-host="${esc(d.host)}" data-add-port="${d.onvif_port}" data-add-name="${esc(d.name || d.host)}" data-add-model="${esc(d.hardware || "")}">Add</button>`}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">No ONVIF devices answered on this network segment.</div>';
        $$("[data-add-host]").forEach((b) => (b.onclick = () => cameraForm({ host: b.dataset.addHost, onvif_port: +b.dataset.addPort, name: b.dataset.addName, model: b.dataset.addModel })));
      } catch (er) { toast(er.message); }
      e.target.disabled = false; e.target.textContent = "Discover cameras";
    };
  }
}

const devListFilter = { q: "", location_id: "" };
async function deviceTable(tab, body) {
  const qs = new URLSearchParams(Object.entries(devListFilter).filter(([, v]) => v)).toString();
  const isCam = tab === "cameras";
  let rows = await api(`/api/${tab}?${qs}`);
  if (!isCam && devListFilter.q) rows = rows.filter((n) => `${n.name} ${n.host}`.toLowerCase().includes(devListFilter.q.toLowerCase()));
  body.innerHTML = `<div class="toolbar">
      <input class="grow" id="dvq" placeholder="Search name or IP" value="${esc(devListFilter.q)}"><select id="dvloc">${locOptions(devListFilter.location_id)}</select>
      <button class="btn primary" id="addDev">Add ${isCam ? "camera" : "NVR"}</button></div>
    <div class="card"><div class="table-wrap"><table class="devtable"><thead><tr><th>Name</th><th>Location / department</th><th>Make, model, serial</th><th>${isCam ? "NVR" : "Channels"}</th><th>State</th><th>Actions</th></tr></thead><tbody>
    ${rows.map((d) => `<tr><td><strong>${esc(d.name)}</strong><div class="muted small">${esc(d.host || "")}</div></td>
      <td class="wrap">${locCell(d)}<div class="small">${esc(d.department || "—")}</div></td>
      <td>${makeModel(d)}<div class="muted small">${d.serial_number ? `SN ${esc(d.serial_number)}` : "Serial not detected yet"}</div></td>
      <td class="small">${isCam ? (d.nvr ? `${esc(d.nvr)}<div class="muted">channel ${d.channel}</div>` : "Standalone") : `${d.camera_count} of ${d.channels} used`}</td>
      <td>${activeBadge(d.enabled)} ${d.enabled ? statusBadge(d.health.status) : ""}${d.health.error && d.enabled ? `<div class="errline small wrap">${esc(d.health.error.slice(0, 60))}</div>` : ""}</td>
      <td class="act-cell"><div class="actions">
        <button class="btn small" data-open="${d.id}">Open</button>
        <button class="btn small" data-edit="${d.id}">Edit</button>
        <button class="btn small" data-toggle="${d.id}">${d.enabled ? "Deactivate" : "Activate"}</button>
        ${can("reboot") ? `<button class="btn small" data-reboot="${d.id}">Reboot</button>` : ""}
        <button class="btn small danger" data-del="${d.id}">Delete</button></div><div class="confirm-slot" id="cs-${d.id}"></div></td></tr>`).join("") || `<tr><td colspan="6" class="empty">No ${isCam ? "cameras" : "NVRs"} yet. Use “Add ${isCam ? "camera" : "NVR"}”.</td></tr>`}
    </tbody></table></div></div>`;
  const kind = isCam ? "camera" : "nvr";
  const byId = (id) => rows.find((r) => String(r.id) === String(id));
  $("#dvq").onchange = (e) => { devListFilter.q = e.target.value; deviceTable(tab, body); };
  $("#dvloc").onchange = (e) => { devListFilter.location_id = e.target.value; deviceTable(tab, body); };
  $("#addDev").onclick = () => (isCam ? cameraForm() : nvrForm());
  $$("[data-open]", body).forEach((b) => (b.onclick = () => deviceDetail(kind, b.dataset.open)));
  $$("[data-edit]", body).forEach((b) => (b.onclick = () => (isCam ? cameraForm(byId(b.dataset.edit)) : nvrForm(byId(b.dataset.edit)))));
  $$("[data-toggle]", body).forEach((b) => (b.onclick = async () => {
    const d = byId(b.dataset.toggle);
    try { const r = await api(`/api/${kind}s/${d.id}/enabled`, { method: "POST", json: { enabled: !d.enabled } }); if (changed(r, d.enabled ? "Deactivated" : "Activated")) deviceTable(tab, body); } catch (e) { toast(e.message); }
  }));
  const inlineConfirm = (id, text, ok, fn) => {
    const slot = $(`#cs-${id}`);
    slot.innerHTML = `<div class="confirm-inline small">${esc(text)} <button class="btn small danger">${esc(ok)}</button> <button class="btn small">Cancel</button></div>`;
    const [yes, no] = $$("button", slot);
    no.onclick = () => (slot.innerHTML = "");
    yes.onclick = async () => { slot.innerHTML = ""; await fn(); };
  };
  $$("[data-reboot]", body).forEach((b) => (b.onclick = () => inlineConfirm(b.dataset.reboot, "Reboot now? It will be offline for 1–3 minutes.", "Reboot", async () => {
    try { const r = await api(`/api/${kind}s/${b.dataset.reboot}/reboot`, { method: "POST" }); toast(`Reboot sent (${r.method}): ${r.message}`); } catch (e) { toast(e.message); }
  })));
  $$("[data-del]", body).forEach((b) => (b.onclick = () => inlineConfirm(b.dataset.del, isCam ? "Delete this camera and its history?" : "Delete this NVR? Its cameras stay, without an NVR.", "Delete", async () => {
    try { const r = await api(`/api/${kind}s/${b.dataset.del}`, { method: "DELETE" }); if (changed(r, "Deleted")) deviceTable(tab, body); } catch (e) { toast(e.message); }
  })));
}

async function cameraForm(c = {}) {
  const info = await api("/api/system/info");
  const nvrs = await api("/api/nvrs");
  const edit = !!c.id;
  const opt = (arr, sel) => arr.map((v) => `<option ${v === sel ? "selected" : ""}>${v}</option>`).join("");
  openDrawer(`<h2>${edit ? `Edit ${esc(c.name)}` : "Add camera"}</h2><form id="camForm" class="card"><div class="form-grid">
    <label class="field">Name*<input name="name" required value="${esc(c.name || "")}"></label>
    <label class="field">Location*<select name="location_id" required>${locOptions(c.location_id || "", false)}</select></label>
    <label class="field">Department<input name="department" value="${esc(c.department || "")}" placeholder="Security, Finance…"></label>
    <label class="field">Make (brand)<select name="vendor">${opt(["generic", "hikvision", "dahua", "cpplus", "axis", "hanwha", "uniview", "bosch", "honeywell"], c.vendor || "generic")}</select></label>
    <label class="field">Model<input name="model" value="${esc(c.model || "")}" placeholder="read from device if blank"></label>
    <label class="field">IP address (ONVIF)<input name="host" value="${esc(c.host || "")}"></label>
    <label class="field">ONVIF port<input name="onvif_port" type="number" value="${c.onvif_port || 80}"></label>
    <label class="field">Main stream RTSP URL<input name="rtsp_url" value="${esc(c.rtsp_url || "")}" placeholder="rtsp://…"></label>
    <label class="field">Sub stream RTSP URL<input name="sub_stream_url" value="${esc(c.sub_stream_url || "")}" placeholder="rtsp://…"></label>
    <label class="field">Username<input name="username" autocomplete="off" value="${esc(c.username || "")}"></label>
    <label class="field">Password<input name="password" type="password" autocomplete="new-password" placeholder="${edit && c.has_password ? "unchanged" : ""}"></label>
    <label class="field">NVR (optional)<select name="nvr_id"><option value="">Standalone</option>${nvrs.map((n) => `<option value="${n.id}" ${n.id === c.nvr_id ? "selected" : ""}>${esc(n.name)}</option>`).join("")}</select></label>
    <label class="field">NVR channel<input name="channel" type="number" min="1" value="${c.channel || ""}"></label>
    <label class="field">Power<select name="power_type">${opt(["poe", "mains", "battery", "solar"], c.power_type || "poe")}</select></label>
    <label class="field">Health driver<select name="driver">${opt(info.camera_drivers, c.driver || "generic")}</select></label>
    <label class="field">Building<input name="building" value="${esc(c.building || "")}"></label>
    <label class="field">Floor<input name="floor" value="${esc(c.floor || "")}"></label>
    <label class="field">Zone / spot<input name="zone" value="${esc(c.zone || "")}"></label>
    <label class="field">Target FPS<input name="target_fps" type="number" step="0.1" value="${c.target_fps || 25}"></label></div>
    <div class="toolbar"><button class="btn primary" type="submit">${edit ? "Save changes" : "Add camera"}</button>${edit ? `<button class="btn" type="button" id="cancelEdit">Cancel</button>` : ""}
    <span class="muted small">${info.ffmpeg_available ? "FFmpeg found: FPS, bitrate and picture checks will run." : "FFmpeg not found: only reachability is checked."} Make, model and serial number are read from the device automatically.</span></div></form>`);
  if (edit) $("#cancelEdit").onclick = () => deviceDetail("camera", c.id);
  $("#camForm").onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    ["location_id", "onvif_port", "target_fps"].forEach((k) => (o[k] = Number(o[k])));
    o.nvr_id = o.nvr_id ? Number(o.nvr_id) : null;
    o.channel = o.channel ? Number(o.channel) : null;
    if (edit && !o.password) delete o.password;
    if (edit) { o.tags = c.tags || []; o.enabled = c.enabled; }
    try {
      const r = await api(edit ? `/api/cameras/${c.id}` : "/api/cameras", { method: edit ? "PATCH" : "POST", json: o });
      if (changed(r, edit ? "Saved" : `Added ${o.name}`)) { closeDrawer(); if (state.route === "devices") renderDevices(); }
      else closeDrawer();
    } catch (er) { toast(er.message); }
  };
}

async function nvrForm(n = {}) {
  const info = await api("/api/system/info");
  const edit = !!n.id;
  const opt = (arr, sel) => arr.map((v) => `<option ${v === sel ? "selected" : ""}>${v}</option>`).join("");
  openDrawer(`<h2>${edit ? `Edit ${esc(n.name)}` : "Add NVR"}</h2><form id="nvrForm" class="card"><div class="form-grid">
    <label class="field">Name*<input name="name" required value="${esc(n.name || "")}"></label>
    <label class="field">Location*<select name="location_id">${locOptions(n.location_id || "", false)}</select></label>
    <label class="field">Department<input name="department" value="${esc(n.department || "")}"></label>
    <label class="field">Make (brand)<select name="vendor">${opt(["hikvision", "dahua", "cpplus", "uniview", "generic"], n.vendor || "hikvision")}</select></label>
    <label class="field">Model<input name="model" value="${esc(n.model || "")}"></label>
    <label class="field">IP address*<input name="host" required value="${esc(n.host || "")}"></label>
    <label class="field">HTTP port<input name="http_port" type="number" value="${n.http_port || 80}"></label>
    <label class="field">RTSP port<input name="rtsp_port" type="number" value="${n.rtsp_port || 554}"></label>
    <label class="field">Channels<input name="channels" type="number" value="${n.channels || 16}" min="1" max="256"></label>
    <label class="field">Username<input name="username" autocomplete="off" value="${esc(n.username || "")}"></label>
    <label class="field">Password<input name="password" type="password" autocomplete="new-password" placeholder="${edit && n.has_password ? "unchanged" : ""}"></label>
    <label class="field">Health driver<select name="driver">${opt(info.nvr_drivers, n.driver || "tcp")}</select></label></div>
    <p class="muted small">Health drivers: <b>tcp</b> checks it answers · <b>onvif</b> also reads make, model, serial and firmware · <b>hikvision_isapi</b> also reads disks and storage.</p>
    <div class="toolbar"><button class="btn primary" type="submit">${edit ? "Save changes" : "Add NVR"}</button>${edit ? `<button class="btn" type="button" id="cancelEdit">Cancel</button>` : ""}</div></form>`);
  if (edit) $("#cancelEdit").onclick = () => nvrDetail(n.id);
  $("#nvrForm").onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    ["location_id", "http_port", "rtsp_port", "channels"].forEach((k) => (o[k] = Number(o[k])));
    if (edit && !o.password) delete o.password;
    if (edit) o.enabled = n.enabled;
    try {
      const r = await api(edit ? `/api/nvrs/${n.id}` : "/api/nvrs", { method: edit ? "PATCH" : "POST", json: o });
      if (changed(r, edit ? "Saved" : `Added ${o.name}. Next: import its channels.`)) { closeDrawer(); if (state.route === "devices") renderDevices(edit ? "nvrs" : "channels"); }
      else closeDrawer();
    } catch (er) { toast(er.message); }
  };
}

// --------------------------------------------------------------- locations --
async function renderLocations() {
  await refreshLocations();
  const orgs = await api("/api/orgs");
  const canAddTop = state.me.role === "super_admin" || state.me.role === "org_admin";
  view.innerHTML = `<div class="grid cols-2"><div class="card"><h2>Location hierarchy <span class="right muted small">access to a location covers everything under it</span></h2>
    <div class="tree">${state.locations.map((l) => `<div class="tree-row indent-${Math.min(l.depth, 7)}">
      <div class="main-col"><div class="title">${l.depth === 0 && multiOrg() ? `<span class="muted">${esc(l.org)} ›</span> ` : ""}${esc(l.name)} <span class="badge neutral">${esc(l.kind)}</span>${l.code ? ` <span class="muted small">${esc(l.code)}</span>` : ""}</div>
      <div class="muted small">${[l.city, `${l.cameras} cameras`, `${l.nvrs} NVRs`, l.contacts ? `${l.contacts} alert contacts` : ""].filter(Boolean).map(esc).join(" · ")}</div></div>
      ${l.can_manage ? `<div class="actions"><button class="btn small" data-child="${l.id}">Add under</button><button class="btn small" data-ledit="${l.id}">Edit</button><button class="btn small danger" data-ldel="${l.id}">Delete</button></div>` : ""}</div>`).join("") || '<div class="empty">No locations.</div>'}</div></div>
    <form class="card" id="locForm"><h2 id="locTitle">Add location</h2><input type="hidden" name="id"><div class="form-grid">
      <label class="field">Name*<input name="name" required placeholder="e.g. Mumbai Andheri Branch"></label>
      <label class="field">Type<select name="kind">${KINDS.map((k) => `<option ${k === "branch" ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <label class="field">Under<select name="parent_id">${canAddTop ? '<option value="">(top level)</option>' : ""}${locOptions("", false, (l) => l.can_manage)}</select></label>
      ${state.me.role === "super_admin" ? `<label class="field">Organization (top level only)<select name="org_id">${orgs.map((o) => `<option value="${o.id}">${esc(o.name)}</option>`).join("")}</select></label>` : ""}
      <label class="field">Code (optional)<input name="code" placeholder="e.g. MUM-AND"></label>
      <label class="field">City<input name="city"></label>
      <label class="field">Address<input name="address"></label></div>
      <div class="toolbar"><button class="btn primary">Save location</button><button class="btn" type="reset" id="locReset">Clear</button></div>
      <p class="muted small">Examples: Corporate Office › West Region › Mumbai Andheri Branch › 2nd Floor › Server Room. Cameras and NVRs can be placed at any level.</p></form></div>`;
  const f = $("#locForm");
  if (!can("manage_locations")) f.hidden = true;
  const setForm = (l, parentId) => {
    f.id.value = l?.id || ""; f.name.value = l?.name || ""; f.kind.value = l?.kind || "branch";
    f.parent_id.value = parentId ?? (l?.parent_id ?? ""); f.code.value = l?.code || ""; f.city.value = l?.city || ""; f.address.value = l?.address || "";
    $("#locTitle").textContent = l ? `Edit ${l.name}` : parentId ? `Add under ${locById(+parentId).name}` : "Add location";
    f.scrollIntoView({ behavior: "smooth" }); f.name.focus();
  };
  $$("[data-child]").forEach((b) => (b.onclick = () => setForm(null, b.dataset.child)));
  $$("[data-ledit]").forEach((b) => (b.onclick = () => setForm(locById(+b.dataset.ledit))));
  $$("[data-ldel]").forEach((b) => (b.onclick = async () => {
    b.textContent = "Confirm delete";
    b.onclick = async () => { try { await api(`/api/locations/${b.dataset.ldel}`, { method: "DELETE" }); toast("Location deleted"); renderLocations(); } catch (e) { toast(e.message); } };
  }));
  $("#locReset").onclick = () => setTimeout(() => ($("#locTitle").textContent = "Add location"));
  f.onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(f));
    const id = o.id; delete o.id;
    o.parent_id = o.parent_id ? Number(o.parent_id) : null;
    if (o.org_id) o.org_id = Number(o.org_id);
    try {
      await api(id ? `/api/locations/${id}` : "/api/locations", { method: id ? "PATCH" : "POST", json: o });
      toast("Location saved"); renderLocations();
    } catch (er) { toast(er.message); }
  };
}

// ---------------------------------------------------------------- contacts --
async function renderContacts() {
  const list = await api("/api/contacts");
  const sevTxt = { info: "All alerts", warning: "Warning & critical", critical: "Critical only" };
  view.innerHTML = `<div class="card"><h2>Alert contacts <span class="right muted small">a contact gets alerts for their location and everything under it</span></h2><div class="table-wrap"><table><thead><tr>
    <th>Name / designation</th><th>Location</th><th>Reach by</th><th>Gets</th><th>When</th><th></th></tr></thead><tbody>
    ${list.map((c) => `<tr><td><strong>${esc(c.name)}</strong><div class="muted small">${esc(c.designation)}</div></td><td class="wrap">${esc(c.location_path)}</td>
      <td class="small">${c.phone ? `${esc(c.phone)}${c.notify_sms ? ' <span class="badge info">SMS</span>' : ""}` : ""}${c.email ? `<div>${esc(c.email)}${c.notify_email ? ' <span class="badge info">Email</span>' : ""}</div>` : ""}</td>
      <td class="small">${sevTxt[c.min_severity]}<div class="muted">${c.device_types.map((t) => (t === "nvr" ? "NVRs" : "cameras")).join(" & ")}</div></td>
      <td class="small wrap">${c.escalation_delay_min ? `<span class="badge warn">Escalation</span><div>after ${c.escalation_delay_min} min if not acknowledged</div>` : "Immediately"}</td>
      <td>${can("manage_contacts") ? `<div class="actions act-cell"><button class="btn small" data-test="${c.id}">Send test</button><button class="btn small" data-cedit="${c.id}">Edit</button><button class="btn small danger" data-cdel="${c.id}">Delete</button></div>` : ""}${c.active ? "" : '<span class="badge neutral">inactive</span>'}</td></tr>`).join("") || '<tr><td colspan="7" class="empty">No alert contacts yet.</td></tr>'}
    </tbody></table></div></div>
    <form class="card" id="ctForm"><h2 id="ctTitle">Add alert contact</h2><input type="hidden" name="id"><div class="form-grid">
      <label class="field">Name*<input name="name" required></label>
      <label class="field">Designation<input name="designation" placeholder="e.g. Branch Security Supervisor"></label>
      <label class="field">Location*<select name="location_id">${locOptions("", false)}</select></label>
      <label class="field">Mobile (with country code)<input name="phone" placeholder="+91 98765 43210" inputmode="tel"></label>
      <label class="field">Email<input name="email" type="email"></label>
      <label class="field">Send by<select name="channels"><option value="email">Email</option><option value="sms">SMS</option><option value="both">Email and SMS</option></select></label>
      <label class="field">Which alerts<select name="min_severity"><option value="critical">Critical only</option><option value="warning" selected>Warning &amp; critical</option><option value="info">All alerts</option></select></label>
      <label class="field">For<select name="device_types"><option value="both">Cameras and NVRs</option><option value="camera">Cameras only</option><option value="nvr">NVRs only</option></select></label>
      <label class="field">When<select name="escalation_delay_min"><option value="0">Immediately</option><option value="15">Escalate after 15 min</option><option value="30">Escalate after 30 min</option><option value="60">Escalate after 1 hour</option><option value="240">Escalate after 4 hours</option></select></label>
      <label class="field">Active<select name="active"><option value="true">Yes</option><option value="false">No</option></select></label></div>
      <div class="toolbar"><button class="btn primary">Save contact</button><button class="btn" type="reset" id="ctReset">Clear</button></div>
      <p class="muted small">Escalation contacts (for example a regional manager) are told only if nobody has acknowledged the alert within the chosen time.</p></form>`;
  const f = $("#ctForm");
  if (!can("manage_contacts")) f.hidden = true;
  $$("[data-cedit]").forEach((b) => (b.onclick = () => {
    const c = list.find((x) => x.id === +b.dataset.cedit);
    f.id.value = c.id; f.name.value = c.name; f.designation.value = c.designation; f.location_id.value = c.location_id;
    f.phone.value = c.phone; f.email.value = c.email; f.channels.value = c.notify_email && c.notify_sms ? "both" : c.notify_sms ? "sms" : "email";
    f.min_severity.value = c.min_severity; f.device_types.value = c.device_types.length === 2 ? "both" : c.device_types[0];
    f.escalation_delay_min.value = String(c.escalation_delay_min); f.active.value = String(c.active);
    $("#ctTitle").textContent = `Edit ${c.name}`; f.scrollIntoView({ behavior: "smooth" });
  }));
  $$("[data-cdel]").forEach((b) => (b.onclick = () => {
    b.textContent = "Confirm delete";
    b.onclick = async () => { try { await api(`/api/contacts/${b.dataset.cdel}`, { method: "DELETE" }); renderContacts(); } catch (e) { toast(e.message); } };
  }));
  $$("[data-test]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try {
      const r = await api(`/api/contacts/${b.dataset.test}/test`, { method: "POST" });
      toast(r.results.map((x) => `${x.channel.toUpperCase()} to ${x.target}: ${x.status}${x.error ? ` (${x.error})` : ""}`).join(" · ") || "Nothing to send");
    } catch (e) { toast(e.message); }
    b.disabled = false;
  }));
  $("#ctReset").onclick = () => setTimeout(() => { $("#ctTitle").textContent = "Add alert contact"; f.id.value = ""; });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(f));
    const id = o.id;
    const body = { name: o.name, designation: o.designation, location_id: +o.location_id, phone: o.phone, email: o.email,
      notify_email: o.channels !== "sms", notify_sms: o.channels !== "email", min_severity: o.min_severity,
      device_types: o.device_types === "both" ? ["camera", "nvr"] : [o.device_types], escalation_delay_min: +o.escalation_delay_min, active: o.active === "true" };
    try { await api(id ? `/api/contacts/${id}` : "/api/contacts", { method: id ? "PATCH" : "POST", json: body }); toast("Contact saved"); renderContacts(); }
    catch (er) { toast(er.message); }
  };
}

// ----------------------------------------------------------------- rules ---
async function renderRules() {
  const rules = await api("/api/alert-rules");
  view.innerHTML = `<div class="card"><h2>Health alert rules</h2><p class="muted small">A rule opens an alert when the condition holds continuously for the duration, and closes it when the condition clears. Devices that do not report a metric are skipped.</p>
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
  $$("[data-del]").forEach((b) => (b.onclick = () => { b.textContent = "Confirm"; b.onclick = async () => { await api(`/api/alert-rules/${b.dataset.del}`, { method: "DELETE" }); renderRules(); }; }));
  $("#ruleForm").onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    o.threshold = +o.threshold; o.duration_s = +o.duration_s;
    try { await api("/api/alert-rules", { method: "POST", json: o }); renderRules(); } catch (er) { toast(er.message); }
  };
}

// ----------------------------------------------------------------- users ---
const ROLE_INFO = {
  super_admin: "Platform admin: every organization",
  org_admin: "Whole organization: devices, locations, users, contacts, approvals",
  location_admin: "Assigned locations and everything under them: devices, users below, contacts, approvals",
  operator: "Assigned locations: watch, acknowledge alerts, review events",
  viewer: "Assigned locations: view only",
  auditor: "Whole organization: view only, plus audit log",
};
const RANK = { super_admin: 100, org_admin: 80, location_admin: 60, operator: 40, auditor: 30, viewer: 20 };
async function renderUsers() {
  const users = await api("/api/users");
  await refreshLocations();
  const orgs = state.me.role === "super_admin" ? await api("/api/orgs") : [];
  const roles = Object.keys(ROLE_INFO).filter((r) => state.me.role === "super_admin" || RANK[r] < RANK[state.me.role]);
  view.innerHTML = `<div class="card"><h2>Users</h2><div class="table-wrap"><table><thead><tr><th>User</th><th>Organization</th><th>Role</th><th>Access</th><th>Active</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td><strong>${esc(u.username)}</strong><div class="muted small">${esc(u.full_name)}${u.designation ? ` · ${esc(u.designation)}` : ""}</div></td>
    <td>${esc(u.org || (u.role === "super_admin" ? "Platform" : "—"))}</td><td>${esc(u.role.replace("_", " "))}</td>
    <td class="small wrap">${["super_admin", "org_admin", "auditor"].includes(u.role) ? (u.org ? "Whole organization" : "All organizations") : esc(u.locations.map((s) => s.path).join("; ") || "None")}</td>
    <td>${u.active ? "Yes" : '<span class="badge neutral">disabled</span>'}</td><td><button class="btn small" data-edit="${u.id}">Edit</button></td></tr>`).join("")}</tbody></table></div></div>
    <form class="card" id="userForm"><h2 id="uTitle">Add user</h2><input type="hidden" name="id"><div class="form-grid">
      <label class="field">Username<input name="username" required></label>
      <label class="field">Full name<input name="full_name"></label>
      <label class="field">Designation<input name="designation" placeholder="e.g. Branch Manager"></label>
      ${orgs.length ? `<label class="field">Organization<select name="org_id">${orgs.map((o) => `<option value="${o.id}">${esc(o.name)}</option>`).join("")}</select></label>` : ""}
      <label class="field">Role<select name="role">${roles.map((r) => `<option value="${r}">${r.replace("_", " ")}</option>`).join("")}</select></label>
      <label class="field">Password (min 10)<input name="password" type="password" autocomplete="new-password"></label>
      <label class="field wide">Locations (access covers everything under each one)<select name="location_ids" multiple size="7">${locOptions("", false, (l) => l.can_manage || state.me.role !== "location_admin")}</select></label>
      <label class="field">Active<select name="active"><option value="true">Yes</option><option value="false">No</option></select></label></div>
      <p class="muted small" id="roleHelp"></p>
      <div class="toolbar"><button class="btn primary">Save user</button><button class="btn" type="reset" id="uReset">Clear</button></div></form>`;
  const f = $("#userForm");
  const help = () => ($("#roleHelp").textContent = ROLE_INFO[f.role.value] || "");
  f.role.onchange = help; help();
  $$("[data-edit]").forEach((b) => (b.onclick = () => {
    const u = users.find((x) => x.id === +b.dataset.edit);
    f.id.value = u.id; f.username.value = u.username; f.username.readOnly = true; f.full_name.value = u.full_name; f.designation.value = u.designation;
    if (!roles.includes(u.role)) f.role.insertAdjacentHTML("beforeend", `<option value="${u.role}">${u.role.replace("_", " ")}</option>`);
    f.role.value = u.role; f.active.value = String(u.active); if (f.org_id && u.org_id) f.org_id.value = u.org_id;
    [...f.location_ids.options].forEach((o) => (o.selected = u.locations.some((s) => String(s.id) === o.value)));
    $("#uTitle").textContent = `Edit ${u.username}`; help();
    f.scrollIntoView({ behavior: "smooth" });
  }));
  $("#uReset").onclick = () => { f.username.readOnly = false; $("#uTitle").textContent = "Add user"; f.id.value = ""; };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const body = { username: f.username.value, full_name: f.full_name.value, designation: f.designation.value, role: f.role.value,
      active: f.active.value === "true", location_ids: [...f.location_ids.selectedOptions].map((o) => +o.value),
      password: f.password.value || null, org_id: f.org_id ? +f.org_id.value : null };
    try {
      if (f.id.value) await api(`/api/users/${f.id.value}`, { method: "PATCH", json: body });
      else await api("/api/users", { method: "POST", json: body });
      toast("User saved"); renderUsers();
    } catch (er) { toast(er.message); }
  };
}

// --------------------------------------------------------- organizations ---
async function renderOrgs() {
  const orgs = await api("/api/orgs");
  view.innerHTML = `<div class="card"><h2>Organizations</h2><div class="table-wrap"><table><thead><tr><th>Organization</th><th>Code</th><th class="num">Locations</th><th class="num">NVRs</th><th class="num">Cameras</th><th class="num">Users</th><th>Approval for changes</th><th>Status</th></tr></thead><tbody>
    ${orgs.map((o) => `<tr><td><strong>${esc(o.name)}</strong></td><td><code>${esc(o.code)}</code></td><td class="num">${o.locations}</td><td class="num">${o.nvrs}</td><td class="num">${o.cameras}</td><td class="num">${o.users}</td>
      <td><label class="small"><input type="checkbox" data-appr="${o.id}" ${o.require_approval ? "checked" : ""}> Required</label></td>
      <td><button class="btn small" data-act="${o.id}">${o.active ? "Active · Deactivate" : "Inactive · Activate"}</button></td></tr>`).join("") || '<tr><td colspan="8" class="empty">No organizations yet.</td></tr>'}
    </tbody></table></div></div>
    <form class="card" id="orgForm"><h2>Add organization</h2><div class="form-grid">
      <label class="field">Name*<input name="name" required placeholder="e.g. Acme Retail Pvt Ltd"></label>
      <label class="field">Short code*<input name="code" required placeholder="ACME" pattern="[A-Za-z0-9_\\-]+"></label>
      <label class="field">Top-level location name<input name="corporate_office" value="Corporate Office"></label>
      <label class="field">Device changes need approval<select name="require_approval"><option value="false">No</option><option value="true">Yes</option></select></label></div>
      <div class="toolbar"><button class="btn primary">Create organization</button></div>
      <p class="muted small">Next: add its regions, branches and offices under <a href="#/locations">Locations</a>, then create its org admin under <a href="#/users">Users &amp; access</a>.</p></form>`;
  $$("[data-appr]").forEach((cb) => (cb.onchange = async () => { try { await api(`/api/orgs/${cb.dataset.appr}`, { method: "PATCH", json: { require_approval: cb.checked } }); toast("Saved"); } catch (e) { toast(e.message); } }));
  $$("[data-act]").forEach((b) => (b.onclick = async () => {
    const o = orgs.find((x) => x.id === +b.dataset.act);
    try { await api(`/api/orgs/${o.id}`, { method: "PATCH", json: { active: !o.active } }); renderOrgs(); } catch (e) { toast(e.message); }
  }));
  $("#orgForm").onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target));
    o.require_approval = o.require_approval === "true";
    try { await api("/api/orgs", { method: "POST", json: o }); toast("Organization created"); await refreshLocations(); renderOrgs(); } catch (er) { toast(er.message); }
  };
}

// ------------------------------------------------------------------ edge ---
async function renderEdge() {
  const devs = await api("/api/edge-devices");
  view.innerHTML = `<div class="card"><h2>Edge AI devices</h2><p class="muted small">Edge boxes (Jetson, NUC, AI cameras) push analytics events to <code>POST /api/edge/events</code> with header <code>X-Edge-Key</code>. A box may send events for cameras at its location and below.</p>
  <table><thead><tr><th>Name</th><th>Location</th><th>Key prefix</th><th>Last seen</th><th></th></tr></thead><tbody>
  ${devs.map((d) => `<tr><td>${esc(d.name)}</td><td class="wrap">${esc(locById(d.location_id)?.path || d.location_id)}</td><td><code>sc_${esc(d.key_prefix)}_…</code></td><td>${ago(d.last_seen)}</td><td><button class="btn small danger" data-del="${d.id}">Revoke</button></td></tr>`).join("") || '<tr><td colspan="5" class="empty">None registered.</td></tr>'}</tbody></table></div>
  <form class="card" id="edgeForm"><h2>Register edge device</h2><div class="toolbar"><input name="name" placeholder="Name" required><select name="location_id">${locOptions("", false)}</select><button class="btn primary">Create key</button></div><div id="edgeKey"></div></form>`;
  $("#edgeForm").onsubmit = async (e) => {
    e.preventDefault();
    const o = Object.fromEntries(new FormData(e.target)); o.location_id = +o.location_id;
    try { const r = await api("/api/edge-devices", { method: "POST", json: o }); $("#edgeKey").innerHTML = `<p class="err">${esc(r.note)}</p><pre class="code">${esc(r.api_key)}</pre>`; } catch (er) { toast(er.message); }
  };
  $$("[data-del]").forEach((b) => (b.onclick = () => { b.textContent = "Confirm revoke"; b.onclick = async () => { await api(`/api/edge-devices/${b.dataset.del}`, { method: "DELETE" }); renderEdge(); }; }));
}

// ----------------------------------------------------------------- audit ---
async function renderAudit() {
  const rows = await api("/api/audit");
  view.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Target</th><th>IP</th></tr></thead><tbody>
  ${rows.map((a) => `<tr><td class="small">${localTime(a.ts)}</td><td>${esc(a.username)}</td><td><code>${esc(a.action)}</code></td><td class="wrap">${esc(a.target)}</td><td class="small">${esc(a.ip)}</td></tr>`).join("") || '<tr><td colspan="5" class="empty">Empty.</td></tr>'}</tbody></table></div></div>`;
}


// -------------------------------------------------------------- use cases --
const UC_STATUS = {
  available: '<span class="badge ok">Available</span>',
  needs_model: '<span class="badge warn">Needs model</span>',
  needs_integration: '<span class="badge info">Needs integration</span>',
};
const ucFilter = { sector: "", category: "", status: "", q: "" };
let capNames = {};
async function loadCapNames() {
  if (Object.keys(capNames).length) return;
  (await api("/api/capabilities")).forEach((c) => (capNames[c.key] = c.name.split(" (")[0]));
}
const reqText = (u) => [...u.missing_capabilities.map((k) => `Model: ${capNames[k] || k}`), ...u.missing_integrations.map((k) => `Integration: ${capNames[k] || k}`)];
const RULE_TEXT = {
  zone_intrusion: "Object in a zone", line_crossing: "Crossing a line", people_count: "Counting across a line", loitering: "Staying too long",
  occupancy: "Too many in a zone", crowd_density: "Crowd density", object_left: "Object left behind", proximity: "Two objects too close",
  dwell: "Time spent in a zone", presence_required: "Too few people present", tailgating: "Several people per entry", fall: "Person fall", speed: "Moving too fast",
};

async function renderUseCases() {
  await loadCapNames();
  const qs = new URLSearchParams(Object.entries(ucFilter).filter(([, v]) => v)).toString();
  const [cov, list] = await Promise.all([api("/api/use-cases/coverage"), api(`/api/use-cases?${qs}`)]);
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  view.innerHTML = `
  <div class="grid kpis">
    <div class="card kpi"><div class="label">Use cases in catalog</div><div class="value">${cov.totals.total}</div><div class="sub">of ${cov.totals.target} in the requirement list</div></div>
    <div class="card kpi ok"><div class="label">Available now</div><div class="value">${cov.totals.available}</div><div class="sub">models and integrations installed</div></div>
    <div class="card kpi"><div class="label">Need a model</div><div class="value">${cov.sectors.reduce((s, x) => s + x.needs_model, 0)}</div><div class="sub">install it to unlock</div></div>
    <div class="card kpi"><div class="label">Need an integration</div><div class="value">${cov.sectors.reduce((s, x) => s + x.needs_integration, 0)}</div><div class="sub">connect the other system</div></div>
  </div>
  <div class="grid cols-2">
    <div class="card"><h2>Coverage by sector <span class="right muted small">catalog vs requirement list</span></h2><div class="table-wrap"><table><thead><tr><th>Sector</th><th class="num">In catalog</th><th></th><th class="num">Available</th><th class="num">Needs model</th><th class="num">Needs integration</th></tr></thead><tbody>
      ${cov.sectors.map((s) => `<tr class="clickable" data-sector="${s.sector}"><td>${esc(s.name)}</td><td class="num">${s.total}/${s.target}</td><td>${meter(pct(s.total, s.target), "bar-acc")}</td><td class="num">${s.available}</td><td class="num">${s.needs_model}</td><td class="num">${s.needs_integration}</td></tr>`).join("")}
    </tbody></table></div></div>
    <div class="card"><h2>Install to unlock more</h2>${hbars(cov.unlock.models.slice(0, 7).map((m) => ({ label: m.name.split(" (")[0], value: m.use_cases, text: `${m.use_cases} use cases` })))}
      <div class="small muted">Integrations: ${cov.unlock.integrations.slice(0, 6).map((m) => `${esc(m.name.split(" (")[0])} (${m.use_cases})`).join(" · ") || "none needed"}</div>
      <div class="toolbar"><a class="btn small" href="#/capabilities">Models &amp; integrations</a></div></div>
  </div>
  <div class="toolbar">
    <input class="grow" id="ucq" placeholder="Search use cases" value="${esc(ucFilter.q)}">
    <select id="ucs"><option value="">All sectors</option>${cov.sectors.map((s) => `<option value="${s.sector}" ${ucFilter.sector === s.sector ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
    <select id="ucc"><option value="">All categories</option>${cov.categories.map((c) => `<option ${ucFilter.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
    <select id="ucst"><option value="">Any status</option><option value="available" ${ucFilter.status === "available" ? "selected" : ""}>Available</option><option value="needs_model" ${ucFilter.status === "needs_model" ? "selected" : ""}>Needs model</option><option value="needs_integration" ${ucFilter.status === "needs_integration" ? "selected" : ""}>Needs integration</option></select>
  </div>
  <div class="card"><div class="muted small">${list.length} use cases</div><div class="table-wrap"><table><thead><tr><th>Use case</th><th>Sector</th><th>Category</th><th>How it works</th><th>Status</th><th>Cameras</th><th></th></tr></thead><tbody>
  ${list.map((u) => `<tr><td class="wrap"><strong>${esc(u.name)}</strong><div class="muted small">${esc(u.key)}${u.builtin ? "" : " · imported"}</div></td>
    <td class="small">${esc(u.sector_name)}</td><td class="small">${esc(u.category)}</td>
    <td class="small wrap">${u.rule ? esc(RULE_TEXT[u.rule.type] || u.rule.type) + (u.rule.classes ? ` <span class="muted">(${esc(u.rule.classes.join(", "))})</span>` : "") : '<span class="muted">Inside the model / integration</span>'}</td>
    <td>${UC_STATUS[u.status]}${reqText(u).length ? `<div class="muted small wrap">${reqText(u).map(esc).join("<br>")}</div>` : ""}</td>
    <td class="num">${u.enabled_cameras || "—"}</td>
    <td>${u.configurable && u.status === "available" && can("manage_devices") ? `<button class="btn small primary" data-setup="${u.key}">Set up on camera</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="7" class="empty">No use cases match.</td></tr>'}
  </tbody></table></div></div>
  ${can("manage_orgs") ? `<div class="card"><h2>Import your use-case list</h2><p class="muted small">Add use cases from your own list (CSV). Columns: key, sector, category, name, description, capabilities, integrations, rule_type, classes, severity. Capabilities and integrations are separated by “;”. Rows are checked first; nothing is imported unless every row is valid.</p>
    <div class="toolbar"><button class="btn" id="ucTpl">Download template</button><input type="file" id="ucFile" accept=".csv,text/csv"></div>
    <textarea id="ucCsv" placeholder="key,sector,category,name,…"></textarea><div class="toolbar"><button class="btn" id="ucVal">Validate</button><button class="btn primary" id="ucImp">Import</button></div><div id="ucRes"></div></div>` : ""}`;
  const re = () => renderUseCases();
  $("#ucq").onchange = (e) => { ucFilter.q = e.target.value; re(); };
  $("#ucs").onchange = (e) => { ucFilter.sector = e.target.value; re(); };
  $("#ucc").onchange = (e) => { ucFilter.category = e.target.value; re(); };
  $("#ucst").onchange = (e) => { ucFilter.status = e.target.value; re(); };
  $$("[data-sector]").forEach((tr) => (tr.onclick = () => { ucFilter.sector = tr.dataset.sector; re(); }));
  $$("[data-setup]").forEach((b) => (b.onclick = () => useCaseSetup({ key: b.dataset.setup })));
  if ($("#ucTpl")) {
    $("#ucTpl").onclick = async () => download("use_case_import_template.csv", await api("/api/use-cases/import/template"));
    $("#ucFile").onchange = async (e) => { $("#ucCsv").value = await e.target.files[0].text(); };
    const send = async (dry) => {
      try {
        const r = await api(`/api/use-cases/import?dry_run=${dry}`, { method: "POST", body: $("#ucCsv").value, headers: { "Content-Type": "text/csv" } });
        $("#ucRes").innerHTML = r.errors.length ? `<p class="err">${r.errors.length} row(s) have errors — nothing imported.</p><table><tbody>${r.errors.map((x) => `<tr><td>Row ${x.row}</td><td class="wrap">${esc(x.error)}</td></tr>`).join("")}</tbody></table>`
          : dry ? `<p><span class="badge ok">${r.valid_rows} rows valid</span></p>` : `<p><span class="badge ok">${r.imported} use cases imported</span></p>`;
        if (!dry && !r.errors.length) setTimeout(re, 800);
      } catch (er) { toast(er.message); }
    };
    $("#ucVal").onclick = () => send(true);
    $("#ucImp").onclick = () => send(false);
  }
}

// --------------------------------------------------- use case setup drawer --
const PARAMS = {
  seconds: ["Alert after (seconds)", 1], max_seconds: ["Alert if longer than (seconds, 0 = never)", 1], min_count: ["Minimum people required", 1],
  max_occupancy: ["Maximum allowed", 1], max_density: ["Maximum density", 1], max_distance: ["Minimum safe distance (fraction of picture width)", 0.01],
  window_s: ["Entries counted together within (seconds)", 0.5], max_speed: ["Speed limit (picture widths per second)", 0.01],
};
const LINE_TYPES = ["line_crossing", "people_count", "tailgating"];
async function useCaseSetup({ key = "", camId = null }) {
  const [ucs, cams] = await Promise.all([api("/api/use-cases?status=available"), api("/api/cameras")]);
  const options = ucs.filter((u) => u.configurable);
  let uc = options.find((u) => u.key === key) || options[0];
  if (!uc) return toast("No configurable use cases are available yet. Install a model under Models & integrations.");
  let pts = [];
  const isLine = () => LINE_TYPES.includes(uc.rule.type);
  const draw = () => {
    const svg = $("#zoneSvg");
    const p = pts.map((q) => `${q[0] * 160},${q[1] * 90}`).join(" ");
    svg.querySelector("#zShape").setAttribute("points", p);
    svg.querySelector("#zShape").setAttribute("class", isLine() ? "zone-line" : "zone-poly");
    svg.querySelector("#zDots").innerHTML = pts.map((q) => `<circle cx="${q[0] * 160}" cy="${q[1] * 90}" r="1.4"/>`).join("");
    $("#zHelp").textContent = isLine() ? (pts.length < 2 ? `Click two points to draw the line (${pts.length}/2).` : "Line set. Clear to redraw.")
      : pts.length < 3 ? `Click at least 3 points around the area (${pts.length} so far), or leave empty for the whole picture.` : `${pts.length} points. Clear to redraw.`;
  };
  const render = () => {
    const params = Object.keys(PARAMS).filter((k) => k in uc.rule);
    openDrawer(`<h2>Set up a use case</h2><form id="ucForm" class="card"><div class="form-grid">
      <label class="field wide">Use case<select name="key">${options.map((u) => `<option value="${u.key}" ${u.key === uc.key ? "selected" : ""}>${esc(u.name)} — ${esc(u.sector_name)}</option>`).join("")}</select></label>
      <label class="field wide">Camera<select name="cam">${cams.map((c) => `<option value="${c.id}" ${String(c.id) === String(camId) ? "selected" : ""}>${esc(c.name)} — ${esc(c.location_path)}</option>`).join("")}</select></label>
      ${params.map((k) => `<label class="field">${PARAMS[k][0]}<input name="${k}" type="number" step="${PARAMS[k][1]}" min="0" value="${uc.rule[k]}"></label>`).join("")}
      ${uc.rule.type === "line_crossing" ? `<label class="field">Direction<select name="direction"><option value="any">Either way</option><option value="left_to_right" ${uc.rule.direction === "left_to_right" ? "selected" : ""}>One way (A→B)</option><option value="right_to_left" ${uc.rule.direction === "right_to_left" ? "selected" : ""}>Other way (B→A)</option></select></label>` : ""}
      <label class="field">Detects<input name="classes" value="${esc((uc.rule.classes || []).join(", "))}"></label></div>
      <p class="small muted">${esc(RULE_TEXT[uc.rule.type] || uc.rule.type)}. Events are named “${esc(uc.name)}” and sent to the location's alert contacts like any other alert.</p>
      <h3>${isLine() ? "Draw the line" : "Draw the zone"}</h3>
      <div class="zone-wrap"><img id="zoneImg" alt="" hidden><svg id="zoneSvg" viewBox="0 0 160 90" role="img" aria-label="Zone editor">
        <defs><pattern id="g" width="16" height="9" patternUnits="userSpaceOnUse"><path d="M16 0H0V9" class="zone-grid"/></pattern></defs>
        <rect width="160" height="90" fill="url(#g)"/><polygon id="zShape" points=""/><g id="zDots" class="zone-dot"></g></svg></div>
      <div class="toolbar"><span id="zHelp" class="small muted grow"></span><button class="btn small" type="button" id="zClear">Clear</button></div>
      <div class="toolbar"><button class="btn primary" type="submit">Turn on</button><button class="btn" type="button" id="ucCancel">Cancel</button></div></form>`);
    const f = $("#ucForm");
    const loadImg = () => {
      const img = $("#zoneImg");
      img.hidden = true;
      img.onload = () => (img.hidden = false);
      img.onerror = () => (img.hidden = true);
      img.src = `/api/cameras/${f.cam.value}/snapshot.jpg?t=${Date.now()}`;
    };
    loadImg();
    f.cam.onchange = loadImg;
    f.key.onchange = () => { uc = options.find((u) => u.key === f.key.value); pts = []; camId = f.cam.value; render(); };
    $("#zoneSvg").onclick = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      if (isLine() && pts.length >= 2) return;
      pts.push([+((e.clientX - r.left) / r.width).toFixed(3), +((e.clientY - r.top) / r.height).toFixed(3)]);
      draw();
    };
    $("#zClear").onclick = () => { pts = []; draw(); };
    $("#ucCancel").onclick = closeDrawer;
    draw();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const body = { key: uc.key, params: {} };
      Object.keys(PARAMS).filter((k) => f[k]).forEach((k) => (body.params[k] = Number(f[k].value)));
      if (f.direction) body.params.direction = f.direction.value;
      const cls = f.classes.value.split(",").map((s) => s.trim()).filter(Boolean);
      if (cls.length) body.params.classes = cls;
      if (isLine()) { if (pts.length === 2) body.line = pts; else if (pts.length) return toast("Draw both ends of the line, or clear it to use the default line."); }
      else if (pts.length >= 3) body.polygon = pts;
      else if (pts.length) return toast("A zone needs at least 3 points, or clear it for the whole picture.");
      try {
        await api(`/api/cameras/${f.cam.value}/use-cases`, { method: "POST", json: body });
        toast(`“${uc.name}” is on for this camera`);
        deviceDetail("camera", f.cam.value);
      } catch (er) { toast(er.message); }
    };
  };
  render();
}

function cameraUseCasesCard(c) {
  const list = (c.analytics || []).filter((a) => a.use_case);
  return `<div class="card"><h2>Use cases on this camera ${can("manage_devices") ? '<button class="btn small right" id="ucAdd" type="button">Add use case</button>' : ""}</h2>
    ${list.length ? `<div class="list">${list.map((a) => `<div class="list-item"><div class="main-col"><div class="title">${esc(a.name || a.use_case)}</div>
      <div class="muted small">${esc(RULE_TEXT[a.type] || a.type)}${a.polygon ? " · custom zone" : a.line ? " · custom line" : " · whole picture"}${a.seconds != null ? ` · ${a.seconds}s` : ""}${a.min_count != null ? ` · min ${a.min_count}` : ""}${a.max_occupancy != null ? ` · max ${a.max_occupancy}` : ""}</div></div>
      ${can("manage_devices") ? `<button class="btn small danger" data-ucdel="${esc(a.use_case)}">Turn off</button>` : ""}</div>`).join("")}</div>`
    : '<div class="muted small">None yet. Use cases run on the edge box or GPU server assigned to this location.</div>'}</div>`;
}
function bindCameraUseCases(c) {
  const add = $("#ucAdd");
  if (add) add.onclick = () => useCaseSetup({ camId: c.id });
  $$("[data-ucdel]").forEach((b) => (b.onclick = async () => {
    try { await api(`/api/cameras/${c.id}/use-cases/${b.dataset.ucdel}`, { method: "DELETE" }); toast("Turned off"); deviceDetail("camera", c.id); } catch (e) { toast(e.message); }
  }));
}

// ------------------------------------------------- models & integrations --
async function renderCapabilities() {
  const caps = await api("/api/capabilities");
  const edit = can("manage_orgs");
  const table = (kind, title, help) => `<div class="card"><h2>${title}</h2><p class="muted small">${help}</p><div class="table-wrap"><table><thead><tr><th>Name</th><th class="num">Use cases</th><th>Installed</th><th>Note</th>${edit ? "<th></th>" : ""}</tr></thead><tbody>
    ${caps.filter((c) => c.kind === kind).map((c) => `<tr><td class="wrap"><strong>${esc(c.name.split(" (")[0])}</strong><div class="muted small">${esc(c.name.includes("(") ? c.name.slice(c.name.indexOf("(") + 1, -1) : "")}</div></td>
      <td class="num">${c.use_cases}</td><td>${c.installed ? '<span class="badge ok">Installed</span>' : '<span class="badge neutral">Not installed</span>'}${c.updated_by ? `<div class="muted small">${esc(c.updated_by)} · ${ago(c.updated_at)}</div>` : ""}</td>
      <td class="small wrap">${edit ? `<input data-note="${c.key}" value="${esc(c.note)}" placeholder="Model version, server, contact…">` : esc(c.note)}</td>
      ${edit ? `<td><button class="btn small ${c.installed ? "" : "primary"}" data-cap="${c.key}" data-on="${c.installed ? 0 : 1}">${c.installed ? "Mark not installed" : "Mark installed"}</button></td>` : ""}</tr>`).join("")}
  </tbody></table></div></div>`;
  view.innerHTML = table("model", "AI models", "Mark a model installed once it runs on your edge boxes or GPU server and has been tested on your own footage. Use cases that need it then show as Available.")
    + table("integration", "Integrations", "Systems whose data some use cases compare with video (POS bills, tokens, rosters, badge events). Mark connected once data is flowing.");
  $$("[data-cap]").forEach((b) => (b.onclick = async () => {
    try { await api(`/api/capabilities/${b.dataset.cap}`, { method: "PATCH", json: { installed: b.dataset.on === "1", note: $(`[data-note="${b.dataset.cap}"]`).value } }); capNames = {}; renderCapabilities(); toast("Saved"); }
    catch (e) { toast(e.message); }
  }));
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
