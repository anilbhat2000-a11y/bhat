/* Display settings (theme, language, font, size, colours, bold, italic) + signed-in user menu.
   Shared by the dashboard, admin panel and login page. Settings are per browser (localStorage). */
(() => {
  "use strict";
  const KEY = "3cits-settings";
  const DEFAULTS = { theme: "dark", lang: "en", font: "default", scale: 1, bold: false, italic: false, bg: "", fg: "" };
  const INDIC = '"Nirmala UI", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Kannada", "Noto Sans Tamil", "Noto Sans Telugu", sans-serif';
  const FONTS = {
    default: { label: "Theme default", body: null, display: null },
    segoe: { label: "Segoe UI", body: `"Segoe UI Variable Text", "Segoe UI", system-ui, ${INDIC}` },
    calibri: { label: "Calibri", body: `Calibri, Carlito, "Segoe UI", ${INDIC}` },
    arial: { label: "Arial", body: `Arial, "Liberation Sans", Helvetica, ${INDIC}` },
    verdana: { label: "Verdana (wide, easy to read)", body: `Verdana, "DejaVu Sans", Geneva, ${INDIC}` },
    tahoma: { label: "Tahoma", body: `Tahoma, "DejaVu Sans", ${INDIC}` },
    georgia: { label: "Georgia (serif)", body: `Georgia, "Times New Roman", "Noto Serif", serif` },
    consolas: { label: "Consolas (monospace)", body: `Consolas, "Cascadia Mono", "DejaVu Sans Mono", monospace` },
    nirmala: { label: "Indic scripts (Nirmala UI)", body: INDIC },
  };
  const THEMES = [["dark", "Dark green"], ["light", "Light green"], ["contrast", "High contrast"], ["classic", "Classic light"]];
  const OVERRIDE_VARS = ["--surface-0", "--surface-1", "--surface-2", "--border", "--grid", "--text-primary", "--text-secondary", "--text-muted"];

  let settings = load();

  function load() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULTS }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode: settings last for this page */ }
  }

  // --- colour helpers ---------------------------------------------------------------
  const hex2rgb = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgb2hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, w) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v * (1 - w) + y[i] * w)); };
  const lum = (h) => { const [r, g, b] = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
  function cssColor(name) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v.startsWith("#")) return v.length === 4 ? "#" + v.slice(1).replace(/./g, "$&$&") : v;
    const m = v.match(/\d+(\.\d+)?/g);
    return m ? rgb2hex(m.slice(0, 3).map(Number)) : "#000000";
  }

  // --- apply --------------------------------------------------------------------------
  function apply() {
    const root = document.documentElement, st = root.style;
    root.dataset.theme = settings.theme;
    OVERRIDE_VARS.forEach((v) => st.removeProperty(v));
    st.removeProperty("color-scheme");
    const f = FONTS[settings.font] || FONTS.default;
    if (f.body) { st.setProperty("--font-body", f.body); st.setProperty("--font-display", f.body); }
    else { st.removeProperty("--font-body"); st.removeProperty("--font-display"); }
    st.setProperty("--fs-scale", String(settings.scale));
    if (settings.bg) {
      const bg = settings.bg, dark = lum(bg) < 0.25, toward = dark ? "#ffffff" : "#000000";
      st.setProperty("--surface-0", bg);
      st.setProperty("--surface-1", mix(bg, toward, dark ? 0.06 : 0.025));
      st.setProperty("--surface-2", mix(bg, toward, dark ? 0.10 : 0.05));
      st.setProperty("--border", mix(bg, toward, dark ? 0.22 : 0.16));
      st.setProperty("--grid", mix(bg, toward, dark ? 0.13 : 0.08));
      st.setProperty("color-scheme", dark ? "dark" : "light");
    }
    if (settings.fg) {
      const base = settings.bg || cssColor("--surface-1");
      st.setProperty("--text-primary", settings.fg);
      st.setProperty("--text-secondary", mix(settings.fg, base, 0.22));
      st.setProperty("--text-muted", mix(settings.fg, base, 0.36));
    }
    if (document.body) {
      document.body.classList.toggle("u-bold", !!settings.bold);
      document.body.classList.toggle("u-italic", !!settings.italic);
    }
    if (window.I18N) I18N.setLang(settings.lang);
    window.dispatchEvent(new CustomEvent("ui-settings-changed", { detail: { ...settings } }));
  }

  // --- dialog -------------------------------------------------------------------------
  function buildDialog() {
    if (document.getElementById("settings")) return;
    const d = document.createElement("dialog");
    d.id = "settings";
    d.setAttribute("aria-labelledby", "settingsTitle");
    d.innerHTML = `<form method="dialog">
      <h2 id="settingsTitle">Display settings</h2>
      <div class="row">
        <label>Theme <select id="sTheme">${THEMES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label>
        <label>Language <select id="sLang">${(window.I18N ? I18N.LANGS : [["en", "English"]]).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label>
      </div>
      <div class="row">
        <label>Font <select id="sFont">${Object.entries(FONTS).map(([v, f]) => `<option value="${v}">${f.label}</option>`).join("")}</select></label>
        <label>Text size <span><input id="sScale" type="range" min="0.8" max="1.6" step="0.05"> <output id="sScaleOut"></output></span></label>
      </div>
      <div class="checks">
        <label><input id="sBold" type="checkbox"> <b>Bold text</b></label>
        <label><input id="sItalic" type="checkbox"> <i>Italic text</i></label>
      </div>
      <div class="row">
        <label>Background colour <span class="swatch"><input id="sBg" type="color"> <label class="inline"><input id="sBgDef" type="checkbox"> Use theme default</label></span></label>
        <label>Font colour <span class="swatch"><input id="sFg" type="color"> <label class="inline"><input id="sFgDef" type="checkbox"> Use theme default</label></span></label>
      </div>
      <div class="preview" id="sPreview"><strong>Preview</strong> · NPU, CPU and GPU load at a glance.<div class="small" id="sContrast"></div></div>
      <div class="foot">
        <span class="muted small">Saved on this computer for this browser.</span>
        <span><button type="button" class="btn ghost" id="sReset">Reset to defaults</button>
        <button class="btn" value="done">Done</button></span>
      </div>
    </form>`;
    document.body.appendChild(d);
    const $ = (id) => d.querySelector("#" + id);
    const sync = () => {
      $("sTheme").value = settings.theme; $("sLang").value = settings.lang; $("sFont").value = settings.font;
      $("sScale").value = settings.scale; $("sScaleOut").textContent = `${Math.round(settings.scale * 100)}%`;
      $("sBold").checked = settings.bold; $("sItalic").checked = settings.italic;
      $("sBgDef").checked = !settings.bg; $("sFgDef").checked = !settings.fg;
      $("sBg").value = settings.bg || cssColor("--surface-0"); $("sFg").value = settings.fg || cssColor("--text-primary");
      $("sBg").disabled = !settings.bg; $("sFg").disabled = !settings.fg;
      const ratio = contrast(cssColor("--text-primary"), cssColor("--surface-1"));
      const ok = ratio >= 4.5;
      $("sContrast").className = "small " + (ok ? "contrast-ok" : "contrast-bad");
      $("sContrast").textContent = `${ok ? "✔ " + I18N.t("Good contrast") : "⚠ " + I18N.t("Low contrast: text may be hard to read")} (${ratio.toFixed(1)}:1)`;
    };
    const update = (patch) => { Object.assign(settings, patch); save(); apply(); sync(); };
    $("sTheme").onchange = (e) => update({ theme: e.target.value });
    $("sLang").onchange = (e) => update({ lang: e.target.value });
    $("sFont").onchange = (e) => update({ font: e.target.value });
    $("sScale").oninput = (e) => update({ scale: Number(e.target.value) });
    $("sBold").onchange = (e) => update({ bold: e.target.checked });
    $("sItalic").onchange = (e) => update({ italic: e.target.checked });
    $("sBg").oninput = (e) => update({ bg: e.target.value });
    $("sFg").oninput = (e) => update({ fg: e.target.value });
    $("sBgDef").onchange = (e) => update({ bg: e.target.checked ? "" : cssColor("--surface-0") });
    $("sFgDef").onchange = (e) => update({ fg: e.target.checked ? "" : cssColor("--text-primary") });
    $("sReset").onclick = () => { settings = { ...DEFAULTS }; save(); apply(); sync(); };
    d.addEventListener("close", () => document.getElementById("settingsBtn")?.focus());
    d._sync = sync;
    if (window.I18N) I18N.apply(d);
  }

  function open() {
    buildDialog();
    const d = document.getElementById("settings");
    d._sync();
    if (window.I18N) I18N.apply(d);
    d.showModal();
  }

  // --- user menu + change password (dashboard & admin) ----------------------------------
  async function mountUser(slot) {
    if (!slot) return null;
    let me;
    try {
      const r = await fetch("/api/auth/me");
      if (r.status === 401) { location.href = "/login"; return null; }
      me = await r.json();
    } catch { return null; }
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const roleName = { admin: "Administrator", operator: "Operator", viewer: "Viewer" }[me.role] || me.role;
    slot.innerHTML = `<details class="usermenu"><summary><span class="avatar" aria-hidden="true">${esc((me.display_name || me.username)[0].toUpperCase())}</span>
        <span class="who"><b>${esc(me.display_name)}</b><span class="small">${esc(roleName)}</span></span></summary>
      <div class="menu">
        ${me.role === "admin" ? `<a href="/admin">Admin panel</a>` : ""}
        <button type="button" data-act="pw">Change password</button>
        <button type="button" data-act="out">Sign out</button>
      </div></details>`;
    slot.querySelector('[data-act="out"]').onclick = async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; };
    slot.querySelector('[data-act="pw"]').onclick = () => passwordDialog(false);
    document.body.dataset.role = me.role;
    if (window.I18N) I18N.apply(slot);
    if (me.must_change_password) passwordDialog(true);
    return me;
  }

  function passwordDialog(forced) {
    let d = document.getElementById("pwDialog");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "pwDialog";
      d.innerHTML = `<form id="pwForm">
        <h2>Change your password</h2>
        <p class="muted small" id="pwForced">Your administrator set a temporary password. Choose a new one to continue.</p>
        <label>Current password <input type="password" id="pwCur" autocomplete="current-password" required></label>
        <label>New password <input type="password" id="pwNew" autocomplete="new-password" required></label>
        <label>Confirm password <input type="password" id="pwNew2" autocomplete="new-password" required></label>
        <div class="err small" id="pwErr" role="alert"></div>
        <div class="foot"><span></span><span><button type="button" class="btn ghost" id="pwCancel">Cancel</button> <button class="btn">Save password</button></span></div>
      </form>`;
      document.body.appendChild(d);
      d.querySelector("#pwCancel").onclick = () => d.close();
      d.addEventListener("cancel", (e) => { if (d.dataset.forced === "1") e.preventDefault(); });
      d.querySelector("#pwForm").onsubmit = async (e) => {
        e.preventDefault();
        const err = d.querySelector("#pwErr");
        if (d.querySelector("#pwNew").value !== d.querySelector("#pwNew2").value) { err.textContent = I18N.t("Passwords do not match."); return; }
        const r = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current: d.querySelector("#pwCur").value, new: d.querySelector("#pwNew").value }) });
        if (!r.ok) { err.textContent = (await r.json()).detail; return; }
        d.dataset.forced = "0"; d.close(); location.reload();
      };
    }
    d.dataset.forced = forced ? "1" : "0";
    d.querySelector("#pwForced").hidden = !forced;
    d.querySelector("#pwCancel").hidden = forced;
    d.querySelector("#pwErr").textContent = "";
    d.querySelector("#pwForm").reset();
    if (window.I18N) I18N.apply(d);
    d.showModal();
  }

  const set = (patch) => { Object.assign(settings, patch); save(); apply(); };
  window.UISettings = { get: () => ({ ...settings }), set, apply, open, mountUser, FONTS };
  // Theme + language as early as possible to avoid a flash of the default look.
  document.documentElement.dataset.theme = settings.theme;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
})();
