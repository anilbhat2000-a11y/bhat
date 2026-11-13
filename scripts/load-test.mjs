// Load test: signs in once, then sends authenticated page requests from many concurrent
// connections and reports latency. Run against a production build (npm run build && npm start)
// or the Nginx address. Example:
//   BASE_URL=https://lms.3cit.local LT_EMAIL=employee@3c.example LT_PASSWORD=... \
//   LT_CONNECTIONS=300 LT_SECONDS=60 node scripts/load-test.mjs
// Self-signed certificate: add NODE_TLS_REJECT_UNAUTHORIZED=0 for the test run only.
import autocannon from "autocannon";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const email = process.env.LT_EMAIL ?? "employee@3c.example";
const password = process.env.LT_PASSWORD;
const connections = Number(process.env.LT_CONNECTIONS ?? 300);
const duration = Number(process.env.LT_SECONDS ?? 30);
// Users pause between pages, so 300 concurrent users send far fewer than 300 requests at
// once. LT_RATE caps the total requests per second across all connections; for example 300
// users opening a page every 10 seconds is LT_RATE=30. Leave it unset for a flat-out test.
const rate = process.env.LT_RATE ? Number(process.env.LT_RATE) : undefined;
const paths = (process.env.LT_PATHS ?? "/learn,/learn/catalogue,/learn/assessments").split(",");
if (!password && !process.env.LT_COOKIE) throw new Error("Set LT_PASSWORD (or LT_COOKIE)");

// Signs in through the real login page in a headless browser and returns the session
// cookie. Set LT_COOKIE=lms_session=... to skip this. PW_CHROMIUM_PATH picks the browser.
async function signIn() {
  if (process.env.LT_COOKIE) return process.env.LT_COOKIE;
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH, args: ["--no-sandbox"] });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto(`${base}/login`);
    await page.fill("input[name=email]", email);
    await page.fill("input[name=password]", password);
    await page.click("button[type=submit]");
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
    const c = (await context.cookies()).find((x) => x.name === "lms_session");
    if (!c) throw new Error("sign-in failed; check LT_EMAIL and LT_PASSWORD");
    return `lms_session=${c.value}`;
  } finally {
    await browser.close();
  }
}

const cookie = await signIn();
const result = await autocannon({
  url: base,
  connections,
  duration,
  headers: { cookie },
  requests: paths.map((path) => ({ method: "GET", path })),
  ...(rate ? { overallRate: rate } : {}),
});
const ok = result["2xx"];
const total = ok + result.non2xx;
console.log(JSON.stringify({
  connections, seconds: duration, targetRate: rate ?? "unlimited", requests: total, non2xx: result.non2xx, errors: result.errors, timeouts: result.timeouts,
  requestsPerSecond: Math.round(result.requests.average),
  latencyMs: { p50: result.latency.p50, p90: result.latency.p90, p99: result.latency.p99, max: result.latency.max },
}, null, 2));
if (result.non2xx > 0 || result.errors > 0) process.exitCode = 1;
