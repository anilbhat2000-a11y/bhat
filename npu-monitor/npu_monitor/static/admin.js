/* Admin panel: users, audit log, security settings. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const t = (s) => I18N.t(s);
  const when = (ts) => (ts ? new Date(ts * 1000).toLocaleString() : t("Never"));
  const ROLE = { viewer: "Viewer", operator: "Operator", admin: "Administrator" };
  let me = null, users = [];

  async function api(path, opts = {}) {
    const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
    if (r.status === 401) { location.href = "/login"; throw new Error("signed out"); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || r.statusText);
    return j;
  }

  $("settingsBtn").onclick = () => UISettings.open();
  document.querySelectorAll("dialog [data-close]").forEach((b) => { b.onclick = () => b.closest("dialog").close(); });

  // tabs (arrow keys move between them)
  const tabs = [["tUsers", "tabUsers", loadUsers], ["tAudit", "tabAudit", loadAudit], ["tSec", "tabSec", loadSec]];
  function select(i) {
    tabs.forEach(([tid, pid], j) => {
      $(tid).setAttribute("aria-selected", String(i === j));
      $(tid).tabIndex = i === j ? 0 : -1;
      $(pid).hidden = i !== j;
    });
    $(tabs[i][0]).focus();
    tabs[i][2]();
  }
  tabs.forEach(([tid], i) => {
    $(tid).onclick = () => select(i);
    $(tid).onkeydown = (e) => {
      if (e.key === "ArrowRight") select((i + 1) % tabs.length);
      if (e.key === "ArrowLeft") select((i + tabs.length - 1) % tabs.length);
    };
  });

  // ---------- users ----------
  async function loadUsers() {
    users = await api("/api/users");
    $("usersTbl").tBodies[0].innerHTML = users.map((u) => {
      const self = me && u.username === me.username;
      return `<tr><td><strong>${esc(u.username)}</strong>${self ? ' <span class="pill mid">you</span>' : ""}
          ${u.must_change_password ? ' <span class="pill" title="must change password at next sign-in">⟳</span>' : ""}</td>
        <td>${esc(u.display_name)}</td><td>${esc(t(ROLE[u.role]))}</td>
        <td><span class="pill ${u.active ? "ok" : "no"}">${esc(t(u.active ? "Active" : "Disabled"))}</span></td>
        <td class="small">${esc(when(u.last_login))}</td>
        <td><div class="act">
          <button class="btn ghost" data-a="edit" data-u="${esc(u.username)}">${esc(t("Edit"))}</button>
          <button class="btn ghost" data-a="reset" data-u="${esc(u.username)}">${esc(t("Reset password"))}</button>
          ${self ? "" : `<button class="btn ghost" data-a="toggle" data-u="${esc(u.username)}">${esc(t(u.active ? "Disable" : "Enable"))}</button>
          <button class="btn ghost" data-a="del" data-u="${esc(u.username)}">${esc(t("Delete"))}</button>`}
        </div></td></tr>`;
    }).join("");
  }

  let editing = null;
  $("usersTbl").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-a]");
    if (!b) return;
    const u = users.find((x) => x.username === b.dataset.u);
    if (!u) return;
    editing = u;
    try {
      if (b.dataset.a === "edit") {
        $("editTitle").textContent = `${t("Edit")}: ${u.username}`;
        $("eName").value = u.display_name; $("eRole").value = u.role; $("eErr").textContent = "";
        $("eRole").disabled = me && u.username === me.username;
        $("editDlg").showModal();
      } else if (b.dataset.a === "reset") {
        $("resetWho").textContent = u.username; $("rPass").value = ""; $("rErr").textContent = "";
        $("resetDlg").showModal();
      } else if (b.dataset.a === "toggle") {
        await api(`/api/users/${encodeURIComponent(u.username)}`, { method: "PATCH", body: JSON.stringify({ active: !u.active }) });
        loadUsers();
      } else if (b.dataset.a === "del") {
        $("confirmWho").textContent = `${u.username} (${u.display_name})`;
        $("confirmDlg").returnValue = "";
        $("confirmDlg").showModal();
      }
    } catch (err) { alert(err.message); }
  });
  $("confirmDlg").addEventListener("close", async () => {
    if ($("confirmDlg").returnValue !== "yes" || !editing) return;
    try { await api(`/api/users/${encodeURIComponent(editing.username)}`, { method: "DELETE" }); loadUsers(); }
    catch (err) { alert(err.message); }
  });
  $("editForm").onsubmit = async (e) => {
    e.preventDefault();
    const body = { display_name: $("eName").value };
    if (!$("eRole").disabled) body.role = $("eRole").value;
    try { await api(`/api/users/${encodeURIComponent(editing.username)}`, { method: "PATCH", body: JSON.stringify(body) }); $("editDlg").close(); loadUsers(); }
    catch (err) { $("eErr").textContent = err.message; }
  };
  $("resetForm").onsubmit = async (e) => {
    e.preventDefault();
    try { await api(`/api/users/${encodeURIComponent(editing.username)}`, { method: "PATCH", body: JSON.stringify({ password: $("rPass").value }) }); $("resetDlg").close(); loadUsers(); }
    catch (err) { $("rErr").textContent = err.message; }
  };
  $("addForm").onsubmit = async (e) => {
    e.preventDefault();
    $("addMsg").textContent = "";
    try {
      const u = await api("/api/users", { method: "POST", body: JSON.stringify({ username: $("aUser").value, display_name: $("aName").value, role: $("aRole").value, password: $("aPass").value }) });
      $("addMsg").innerHTML = `<span class="contrast-ok">✔ ${esc(u.username)} (${esc(t(ROLE[u.role]))})</span>`;
      $("addForm").reset(); loadUsers();
    } catch (err) { $("addMsg").innerHTML = `<span class="err">${esc(err.message)}</span>`; }
  };

  // ---------- audit ----------
  let audit = [];
  const ACTION_LABEL = (a) => a.replace(/_/g, " ");
  function renderAudit() {
    const q = $("auditFilter").value.trim().toLowerCase();
    const rows = audit.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    $("auditTbl").tBodies[0].innerHTML = rows.map((r) => `<tr class="${r.action === "login_failed" ? "warnrow" : ""}">
      <td class="small">${esc(new Date(r.ts * 1000).toLocaleString())}</td><td>${esc(r.actor)}</td>
      <td>${r.action === "login_failed" ? '<span class="pill no">' : '<span class="pill mid">'}${esc(ACTION_LABEL(r.action))}</span></td>
      <td class="small" style="white-space:normal">${esc(r.detail)}</td><td class="small">${esc(r.ip)}</td></tr>`).join("");
  }
  async function loadAudit() { audit = await api("/api/audit?limit=500"); renderAudit(); }
  $("auditFilter").oninput = renderAudit;

  // ---------- security ----------
  const SEC = ["session_minutes", "min_password_length", "max_failed_logins", "lockout_minutes"];
  async function loadSec() {
    const s = await api("/api/security");
    SEC.forEach((k) => { $("sec_" + k).value = s[k]; });
    $("secInfo").textContent = `${t("Active sessions")}: ${s.active_sessions} · ${t("Fleet token")}: ${s.fleet_token_set ? "✔" : "—"}`;
  }
  $("secForm").onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(SEC.map((k) => [k, Number($("sec_" + k).value)]));
    try { await api("/api/security", { method: "PUT", body: JSON.stringify(body) }); $("secMsg").innerHTML = `<span class="contrast-ok">${esc(t("Saved."))}</span>`; }
    catch (err) { $("secMsg").innerHTML = `<span class="err">${esc(err.message)}</span>`; }
  };

  (async () => {
    me = await UISettings.mountUser($("userSlot"));
    if (!me) return;
    if (me.role !== "admin") { location.href = "/app"; return; }
    loadUsers();
    window.addEventListener("ui-settings-changed", () => { loadUsers(); });
  })();
})();
