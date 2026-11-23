// Walks a fresh 3C ITS VisionOps install through the setup described in the
// installation guide and saves one screenshot per step. Run via capture.sh.
const { chromium } = require("playwright");
const BASE = process.env.BASE;
const PW = process.env.ADMIN_PW;
const OUT = (process.env.OUT || "img").replace(/\/$/, "") + "/";
const USER_PW = "Guide@2026pw";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const newPage = async (w = 1280, h = 800) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    return p;
  };
  const login = async (p, u, pw) => {
    await p.goto(BASE); await p.waitForSelector("#loginForm");
    await p.fill("input[name=username]", u); await p.fill("input[name=password]", pw);
    await p.click("button[type=submit]"); await p.waitForSelector(".kpi");
  };
  const shot = async (p, name, opts = {}) => { await sleep(600); await p.screenshot({ path: OUT + name + ".png", ...opts }); };
  const go = async (p, route, sel) => { await p.goto(`${BASE}/#/${route}`); if (sel) await p.waitForSelector(sel); await sleep(400); };
  const toastGone = async (p) => { await p.evaluate(() => { const t = document.querySelector("#toast"); if (t) t.hidden = true; }); };

  const a = await newPage();
  await a.goto(BASE); await a.waitForSelector("#loginForm");
  await a.fill("input[name=username]", "admin"); await a.fill("input[name=password]", PW);
  await shot(a, "01-login");
  await a.click("button[type=submit]"); await a.waitForSelector(".kpi");
  await shot(a, "02-first-login");

  // Organization
  await go(a, "orgs", "#orgForm");
  await a.fill("#orgForm input[name=name]", "Acme Retail Pvt Ltd");
  await a.fill("#orgForm input[name=code]", "ACME");
  await a.selectOption("#orgForm select[name=require_approval]", "true");
  await a.click("#orgForm button"); await sleep(900); await toastGone(a);
  await shot(a, "03-organizations");

  // Locations
  await go(a, "locations", "#locForm");
  const addLoc = async (name, kind, parentLabel, code, city) => {
    await a.fill("#locForm input[name=name]", name);
    await a.selectOption("#locForm select[name=kind]", kind);
    const opt = await a.$$eval("#locForm select[name=parent_id] option", (os, lbl) => (os.find((o) => o.textContent.trim().replace(/^└\s*/, "").endsWith(lbl)) || {}).value, parentLabel);
    await a.selectOption("#locForm select[name=parent_id]", opt);
    await a.fill("#locForm input[name=code]", code); await a.fill("#locForm input[name=city]", city);
    await a.click("#locForm button.primary"); await sleep(900);
  };
  await addLoc("West Region", "region", "Corporate Office", "ACME-W", "Mumbai");
  await addLoc("Mumbai Andheri Branch", "branch", "West Region", "MUM-AND", "Mumbai");
  await addLoc("Pune Warehouse", "warehouse", "West Region", "PUN-WH", "Pune");
  await addLoc("2nd Floor", "floor", "Mumbai Andheri Branch", "MUM-AND-F2", "Mumbai");
  const floorBtn = await a.$$eval(".tree-row", (rows) => { const r = rows.find((x) => x.textContent.includes("2nd Floor")); return r ? r.querySelector("[data-child]").dataset.child : null; });
  if (floorBtn) await a.click(`[data-child="${floorBtn}"]`);
  await a.fill("#locForm input[name=name]", "Server Room");
  await a.selectOption("#locForm select[name=kind]", "area");
  await toastGone(a);
  await shot(a, "04-locations");

  // Users
  await go(a, "users", "#userForm");
  const addUser = async (u, full, desig, role, locLabel, snap) => {
    await a.fill("#userForm input[name=username]", u); await a.fill("#userForm input[name=full_name]", full);
    await a.fill("#userForm input[name=designation]", desig); await a.selectOption("#userForm select[name=role]", role);
    await a.fill("#userForm input[name=password]", USER_PW);
    if (locLabel) {
      const v = await a.$$eval("#userForm select[name=location_ids] option", (os, l) => os.find((o) => o.textContent.trim().replace(/^└\s*/, "").endsWith(l)).value, locLabel);
      await a.selectOption("#userForm select[name=location_ids]", [v]);
    }
    if (snap) { await a.locator("#userForm").scrollIntoViewIfNeeded(); await shot(a, snap); }
    await a.click("#userForm button.primary"); await sleep(900);
  };
  await addUser("acme.admin", "Priya Sharma", "Head of Security", "org_admin", null);
  await addUser("west.manager", "Rahul Mehta", "Regional Security Manager", "location_admin", "West Region");
  await addUser("andheri.admin", "Sanjay Patil", "Branch Admin", "location_admin", "Mumbai Andheri Branch", "05-add-user");
  await addUser("andheri.guard", "Vikram Singh", "Security Supervisor", "operator", "Mumbai Andheri Branch");
  await go(a, "users", "#userForm"); await toastGone(a);
  await shot(a, "06-users");

  // Alert contacts
  await go(a, "contacts", "#ctForm");
  const addContact = async (name, desig, locLabel, phone, email, channels, sev, when) => {
    await a.fill("#ctForm input[name=name]", name); await a.fill("#ctForm input[name=designation]", desig);
    const v = await a.$$eval("#ctForm select[name=location_id] option", (os, l) => os.find((o) => o.textContent.trim().replace(/^└\s*/, "").endsWith(l)).value, locLabel);
    await a.selectOption("#ctForm select[name=location_id]", v);
    await a.fill("#ctForm input[name=phone]", phone); await a.fill("#ctForm input[name=email]", email);
    await a.selectOption("#ctForm select[name=channels]", channels); await a.selectOption("#ctForm select[name=min_severity]", sev);
    await a.selectOption("#ctForm select[name=escalation_delay_min]", when);
    await a.click("#ctForm button.primary"); await sleep(900);
  };
  await addContact("Vikram Singh", "Security Supervisor", "Mumbai Andheri Branch", "+91 98000 00001", "vikram@acme.example", "both", "warning", "0");
  await addContact("Rahul Mehta", "Regional Security Manager", "West Region", "+91 98000 00002", "rahul@acme.example", "both", "critical", "30");
  await addContact("Priya Sharma", "Head of Security", "Corporate Office", "+91 98000 00003", "priya@acme.example", "email", "critical", "60");
  await toastGone(a);
  await shot(a, "07-alert-contacts", { fullPage: true });

  // NVR + channels
  await go(a, "devices", "[data-tab=nvrs]");
  await a.click("[data-tab=nvrs]"); await a.waitForSelector("#addDev"); await a.click("#addDev"); await a.waitForSelector("#nvrForm");
  const pick = async (sel, label) => {
    const v = await a.$$eval(`${sel} option`, (os, l) => os.find((o) => o.textContent.trim().replace(/^└\s*/, "").endsWith(l)).value, label);
    await a.selectOption(sel, v);
  };
  await a.fill("#nvrForm input[name=name]", "Andheri NVR-1"); await pick("#nvrForm select[name=location_id]", "Mumbai Andheri Branch");
  await a.fill("#nvrForm input[name=department]", "Security"); await a.fill("#nvrForm input[name=model]", "DS-7616NI-K2");
  await a.fill("#nvrForm input[name=host]", "192.168.10.10"); await a.fill("#nvrForm input[name=username]", "admin");
  await a.fill("#nvrForm input[name=password]", "nvr-password"); await a.selectOption("#nvrForm select[name=driver]", "simulator");
  await shot(a, "08-add-nvr");
  await a.click("#nvrForm button[type=submit]"); await a.waitForSelector("#chForm");
  await a.fill("#chForm input[name=channels]", "1-8"); await a.selectOption("#chForm select[name=driver]", "simulator");
  await a.click("#chForm button[type=submit]"); await a.waitForSelector("#chResult .badge"); await toastGone(a);
  await shot(a, "09-import-channels");

  // CSV
  await a.click("[data-tab=csv]"); await a.waitForSelector("#csvText");
  const header = "name,location,host,rtsp_url,sub_stream_url,vendor,model,username,password,power_type,building,floor,zone,onvif_port,target_fps,driver,tags,department\n";
  const rows = [
    "Pune Gate Solar,PUN-WH,192.168.20.31,rtsp://192.168.20.31:554/Streaming/Channels/101,rtsp://192.168.20.31:554/Streaming/Channels/102,hikvision,DS-2XS6A46G1,admin,cam-pass,solar,Yard,G,Main Gate,80,20,simulator,perimeter,Security",
    "Pune Fence 4G,Corporate Office / West Region / Pune Warehouse,192.168.20.32,rtsp://192.168.20.32:554/Streaming/Channels/101,,hikvision,DS-2XS2T41G1,admin,cam-pass,battery,Yard,G,Perimeter,80,15,simulator,perimeter,Security",
    "Pune Dock,Pune Warehouse,192.168.20.33,http://192.168.20.33/live,,dahua,IPC-HFW2441,admin,cam-pass,poe,Block B,G,Loading Bay,80,25,simulator,,Logistics",
  ];
  await a.fill("#csvText", header + rows.join("\n"));
  await a.click("#csvCheck"); await a.waitForSelector("#csvResult p");
  await shot(a, "10-csv-validate-error");
  rows[2] = rows[2].replace("http://192.168.20.33/live", "rtsp://192.168.20.33:554/cam/realmonitor?channel=1&subtype=0");
  await a.fill("#csvText", header + rows.join("\n"));
  await a.click("#csvImport"); await sleep(900);
  await shot(a, "11-csv-imported");

  // Single camera
  await a.click("[data-tab=cameras]"); await a.waitForSelector("#addDev"); await a.click("#addDev"); await a.waitForSelector("#camForm");
  await a.fill("#camForm input[name=name]", "Reception Dome"); await pick("#camForm select[name=location_id]", "2nd Floor");
  await a.fill("#camForm input[name=department]", "Admin"); await a.selectOption("#camForm select[name=vendor]", "axis");
  await a.fill("#camForm input[name=host]", "192.168.10.50"); await a.fill("#camForm input[name=rtsp_url]", "rtsp://192.168.10.50/axis-media/media.amp");
  await a.fill("#camForm input[name=username]", "root"); await a.fill("#camForm input[name=password]", "secret");
  await a.selectOption("#camForm select[name=driver]", "simulator"); await a.fill("#camForm input[name=zone]", "Reception");
  await shot(a, "12-add-camera");
  await a.click("#camForm button[type=submit]"); await sleep(900);

  // Discovery
  await go(a, "overview", ".kpi"); await go(a, "devices", "[data-tab=discover]"); await a.click("[data-tab=discover]"); await a.waitForSelector("#dRun");
  await a.click("#dRun"); await a.waitForSelector("#dResult .empty, #dResult table", { timeout: 20000 });
  await shot(a, "13-discovery");

  // Let the collector read every device a few times.
  await sleep(16000);
  await go(a, "overview", ".kpi"); await go(a, "devices", "[data-tab=cameras]");
  await a.click("[data-tab=cameras]"); await a.waitForSelector("[data-open]"); await toastGone(a);
  await shot(a, "14-manage-devices");
  await a.click("[data-open]"); await a.waitForSelector("[data-act=troubleshoot]"); await sleep(500);
  await shot(a, "15-device-details");
  await a.click("[data-act=troubleshoot]"); await a.waitForSelector("#tsResult .steps");
  await shot(a, "16-troubleshoot");
  await a.click("[data-act=reboot]"); await a.waitForSelector("#cbOk");
  await shot(a, "17-reboot-confirm");
  await a.click("#cbNo"); await a.keyboard.press("Escape");

  // AI use cases: install a model, browse the catalog, switch one on for a camera
  await go(a, "capabilities", "[data-cap]");
  await a.fill('[data-note="person_vehicle"]', "YOLOv8m on the GPU server, tested on site footage");
  await a.click('[data-cap="person_vehicle"]'); await sleep(900); await toastGone(a);
  await shot(a, "31-models");
  await go(a, "usecases", "#ucs"); await shot(a, "32-use-cases");
  await a.selectOption("#ucs", "banking"); await sleep(900);
  await a.evaluate(() => document.querySelector("#ucq").scrollIntoView()); await shot(a, "33-use-cases-banking");
  await go(a, "cameras", "tr.clickable"); await a.click("tr.clickable"); await a.waitForSelector("#ucAdd");
  await a.click("#ucAdd"); await a.waitForSelector("#ucForm");
  await a.selectOption("#ucForm select[name=key]", "gen_intrusion"); await sleep(500);
  const zb = await a.locator("#zoneSvg").boundingBox();
  for (const [x, y] of [[0.15, 0.35], [0.85, 0.35], [0.9, 0.95], [0.1, 0.95]]) await a.mouse.click(zb.x + zb.width * x, zb.y + zb.height * y);
  await shot(a, "34-use-case-setup");
  await a.click("#ucForm button[type=submit]"); await a.waitForSelector("[data-ucdel]"); await toastGone(a);
  await a.locator("[data-ucdel]").scrollIntoViewIfNeeded(); await shot(a, "35-camera-use-cases");
  await a.keyboard.press("Escape");

  // Dashboards
  await go(a, "overview", ".kpi"); await shot(a, "18-overview", { fullPage: true });
  await go(a, "cameras", "tr.clickable"); await shot(a, "19-camera-health");
  await go(a, "batteries", "tr.clickable"); await shot(a, "20-battery-health");
  await go(a, "nvrs", "tr.clickable"); await shot(a, "21-nvr-status");
  await a.click("tr.clickable"); await a.waitForSelector("#drawerBody h2"); await shot(a, "22-nvr-details");
  await a.keyboard.press("Escape");

  // Approval flow
  const br = await newPage();
  await login(br, "andheri.admin", USER_PW);
  await go(br, "devices", "#addDev"); await br.click("#addDev"); await br.waitForSelector("#camForm");
  await br.fill("#camForm input[name=name]", "Andheri Back Door"); await br.fill("#camForm input[name=rtsp_url]", "rtsp://192.168.10.61/stream1");
  await br.fill("#camForm input[name=department]", "Security"); await br.selectOption("#camForm select[name=driver]", "simulator");
  await br.click("#camForm button[type=submit]"); await sleep(700);
  await shot(br, "23-sent-for-approval");
  const wm = await newPage();
  await login(wm, "west.manager", USER_PW);
  await go(wm, "approvals", "[data-dec]"); await shot(wm, "24-approvals");
  await wm.fill("[data-note]", "Approved for night coverage"); await wm.click('[data-dec][data-ok="1"]'); await sleep(900);
  await go(wm, "overview", ".kpi"); await shot(wm, "25-regional-view");

  // Contacts test + notification log
  await go(a, "contacts", "[data-test]"); await a.click("[data-test]"); await sleep(900);
  await go(a, "notifications"); await shot(a, "26-notification-log");
  await go(a, "rules", "#ruleForm"); await shot(a, "27-alert-rules");
  await go(a, "edge", "#edgeForm");
  await a.fill("#edgeForm input[name=name]", "jetson-andheri-01"); await pick("#edgeForm select[name=location_id]", "Mumbai Andheri Branch");
  await a.click("#edgeForm button"); await a.waitForSelector("#edgeKey pre");
  await a.evaluate(() => { const p = document.querySelector("#edgeKey pre"); p.textContent = p.textContent.slice(0, 16) + "••••••••••••••••••••••••••••"; });
  await shot(a, "28-edge-key");
  await go(a, "audit"); await shot(a, "29-audit");

  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const q = await ph.newPage();
  q.on("pageerror", (e) => errors.push(e.message));
  await login(q, "admin", PW); await sleep(600);
  await q.screenshot({ path: OUT + "30-phone.png" });

  await browser.close();
  if (errors.length) { console.error("Page errors:", errors); process.exit(1); }
  console.log("done");
})();
