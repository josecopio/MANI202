#!/usr/bin/env node
/**
 * Records the product demo video: 7am push notification -> event page with entrance map ->
 * Calendar tab -> another event -> calendar subscription.
 *
 *   node scripts/demo-video/record.mjs                 # English, app on http://localhost:3000
 *   DEMO_LANG=fr node scripts/demo-video/record.mjs    # French
 *   BASE_URL=http://localhost:3100 OUT=demo.mp4 node scripts/demo-video/record.mjs
 *
 * Needs: the app running with fresh sample data (`npm run db:seed` the same day), Playwright's
 * Chromium (`npx playwright install chromium`) and ffmpeg (`brew install ffmpeg`).
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const LANG = process.env.DEMO_LANG === "fr" ? "fr" : "en";
const OUT = resolve(process.env.OUT ?? `demo-video-${LANG}.mp4`);
const SCALE = Number(process.env.SCALE ?? 2); // render at 2x, encode at 1080p: crisp text
const FPS = 30;

const COPY = {
  en: {
    brand: "CIUP · Access & restrictions",
    intro: ["Never caught off guard", "A resident’s morning, from a notification to their own calendar."],
    outro: ["Every access, every restriction", "Always up to date, wherever residents look."],
    steps: [
      { title: "7:00 — the morning briefing", text: "One notification per building: what is closed today and how to get in anyway." },
      { title: "Straight to the event", text: "One tap opens the details, the bracelet to collect and a map of open and closed entrances." },
      { title: "The week ahead", text: "The Calendar tab lists every restriction of the next seven days in the houses you follow." },
      { title: "In your own calendar", text: "Subscribe once with Apple, Google or Outlook: restrictions update automatically." },
    ],
    garden: "Garden",
    apple: "Apple Calendar",
  },
  fr: {
    brand: "CIUP · Accès et restrictions",
    intro: ["Jamais pris au dépourvu", "La matinée d’un résident, de la notification à son propre agenda."],
    outro: ["Tous vos accès, toutes les restrictions", "Toujours à jour, là où les résidents regardent."],
    steps: [
      { title: "7h00 — le point du matin", text: "Une notification par bâtiment : ce qui est fermé aujourd’hui et comment entrer malgré tout." },
      { title: "Directement sur l’événement", text: "Un geste ouvre le détail, le bracelet à retirer et le plan des entrées ouvertes et fermées." },
      { title: "La semaine à venir", text: "L’onglet Agenda liste toutes les restrictions des sept prochains jours dans vos maisons." },
      { title: "Dans votre propre agenda", text: "Abonnez-vous une fois avec Apple, Google ou Outlook : tout se met à jour seul." },
    ],
    garden: "Jardin",
    apple: "Apple Calendrier",
  },
}[LANG];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Documents fulfilled by the route below count as "public": let them reach localhost.
const browser = await chromium.launch({ args: ["--disable-features=LocalNetworkAccessChecks"] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE, hasTouch: false });
const host = new URL(BASE).hostname;
await context.addCookies([
  { name: "ciup-locale", value: LANG, domain: host, path: "/" },
  { name: "ciup-video-demo", value: "1", domain: host, path: "/" },
  // The demo resident lives at the Maison du Japon and uses the Maison internationale and the sports centre.
  { name: "ciup-prefs", value: encodeURIComponent(JSON.stringify({ h: "japon", o: ["maison-internationale", "centre-sportif"], i: [], g: 1 })), domain: host, path: "/" },
]);
// Inside the phone: room for the status bar above the app header; hide Next's dev indicator.
await context.addInitScript(() => {
  if (window.top === window) return;
  const css = "header{padding-top:52px!important} nextjs-portal{display:none!important} html{scrollbar-width:none} ::-webkit-scrollbar{display:none}";
  const add = () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); };
  if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
});

// The app forbids framing (X-Frame-Options: DENY); lift it in this browser only, for the phone frame.
await context.route(`${BASE}/**`, async (route) => {
  if (route.request().resourceType() !== "document" || route.request().url().endsWith("/__demo-stage")) return route.fallback();
  const response = await route.fetch();
  const headers = { ...response.headers() };
  delete headers["x-frame-options"];
  await route.fulfill({ response, headers });
});

const page = await context.newPage();
const stageHtml = readFileSync(join(here, "stage.html"), "utf8");
await page.route(`${BASE}/__demo-stage`, (route) => route.fulfill({ contentType: "text/html", body: stageHtml }));
await page.goto(`${BASE}/__demo-stage`);
await page.evaluate((c) => window.stage.setup({ brand: c.brand, steps: c.steps }), COPY);
await page.evaluate((c) => window.stage.card(c.intro[0], c.intro[1]), COPY);
await page.evaluate(() => document.fonts.ready);

const frame = () => page.frames().find((f) => f !== page.mainFrame());
const app = page.frameLocator("#app");

async function navigate(path) {
  await page.evaluate((src) => { document.getElementById("app").src = src; }, `${BASE}${path}`);
  await page.waitForFunction((src) => {
    const w = document.getElementById("app").contentWindow;
    try { return w.location.href === src && w.document.readyState !== "loading" && w.document.querySelector("main"); } catch { return false; }
  }, `${BASE}${path}`, { timeout: 90000 });
  await sleep(600);
}

/** Moves the finger to an element inside the phone, presses, clicks. */
async function tap(locator, { hold = 450 } = {}) {
  await locator.waitFor({ state: "visible" });
  const b = await locator.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.evaluate(([x, y]) => window.stage.touch(x, y, "on"), [x, y]);
  await sleep(hold);
  await page.evaluate(() => window.stage.touch(null, null, "press"));
  await sleep(160);
  await locator.click();
  await page.evaluate(() => window.stage.touch(null, null, "off"));
}

/** Smooth, eased scroll inside the phone (with a finger swipe), to an absolute position or an element. */
async function scroll(target, ms = 1400, offset = 120) {
  const f = frame();
  const to = typeof target === "number" ? target : await target.evaluate((el, off) => el.getBoundingClientRect().top + window.scrollY - off, offset);
  const from = await f.evaluate(() => window.scrollY);
  const down = to > from;
  const phone = await page.locator(".screen").boundingBox();
  const cx = phone.x + phone.width * 0.62;
  await page.evaluate(([a, b, c, d, t]) => window.stage.touchMove(a, b, c, d, t), [cx, phone.y + (down ? 640 : 260), cx, phone.y + (down ? 260 : 640), ms]);
  await f.evaluate(([to, ms]) => new Promise((done) => {
    const from = window.scrollY, t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, from + (to - from) * ease(k));
      k < 1 ? requestAnimationFrame(tick) : done();
    };
    requestAnimationFrame(tick);
  }), [Math.max(0, to), ms]);
  await sleep(200);
}

// ---- load the first screen before recording (the notification waits for its cue) ------------
await navigate("/demo?manual=1");
await page.evaluate(() => window.stage.status("lock"));

// ---- record ---------------------------------------------------------------------------------
const dir = mkdtempSync(join(tmpdir(), "ciup-demo-"));
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  const file = join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
  frames.push({ file, t: metadata.timestamp });
  writeFileSync(file, Buffer.from(data, "base64"));
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920 * SCALE, maxHeight: 1080 * SCALE, everyNthFrame: 1 });
const t0 = Date.now();

// Intro card
await sleep(2600);
await page.evaluate(() => window.stage.card(null));
await sleep(800);

// 1. Lock screen + notification: it slides in, then the camera zooms on it for ~6 s
await page.evaluate(() => window.stage.step(0));
await sleep(1400);
await frame().evaluate(() => window.showNotification());
await sleep(1600);
const note = await app.locator("#demo-notification").boundingBox();
await page.evaluate((r) => window.stage.zoom(r, 2.1), note);
await sleep(1100 + 6000);
await page.evaluate(() => window.stage.zoom(null));
await sleep(1600);

// 2. Tap the notification -> event page
await page.evaluate(() => window.stage.step(1));
await sleep(600);
await tap(app.locator("#demo-notification"));
await page.waitForFunction(() => /\/events\//.test(document.getElementById("app").contentWindow.location.pathname));
await app.locator("h1").first().waitFor();
await page.evaluate(() => window.stage.status("app", "7:01"));
await sleep(2600);
await scroll(app.locator("#changes"), 1500, 70);
await sleep(3800);
await scroll(app.locator("#entrances"), 1500, 70);
await sleep(5200);
await scroll(app.locator("#about"), 1400, 70);
await sleep(2800);

// 3. Calendar tab
await page.evaluate(() => window.stage.step(2));
await scroll(0, 1100);
await sleep(500);
await tap(app.locator('a[href="/calendar"]').filter({ visible: true }).last());
await page.waitForFunction(() => document.getElementById("app").contentWindow.location.pathname === "/calendar");
await app.locator("ol li").first().waitFor();
await sleep(2200);
const cards = app.locator('ol a[href^="/events/"]');
const other = cards.filter({ hasText: COPY.garden }).first();
await scroll(other, 3200, 300);
await sleep(1500);

// ... checks out another upcoming event
await tap(other);
await page.waitForFunction(() => /\/events\//.test(document.getElementById("app").contentWindow.location.pathname));
await app.locator("h1").first().waitFor();
await sleep(2200);
await scroll(app.locator("#entrances"), 1600, 70);
await sleep(3600);

// back to the calendar
await scroll(0, 1000);
await tap(app.locator('main a[href="/calendar"]').first());
await page.waitForFunction(() => document.getElementById("app").contentWindow.location.pathname === "/calendar");
await app.locator("#connect-title").waitFor();
await sleep(800);

// 4. Connect the calendar
await page.evaluate(() => window.stage.step(3));
await scroll(app.locator("#connect-title"), 2400, 230);
await sleep(1600);
await tap(app.getByRole("link", { name: COPY.apple }));
await sleep(2400);
await tap(app.locator("#demo-subscribe"));
await sleep(4200);
await tap(app.locator("#demo-done"));
await sleep(1800);

// Outro
await page.evaluate(() => window.stage.step(4));
await page.evaluate((c) => window.stage.card(c.outro[0], c.outro[1]), COPY);
await sleep(3500);

await cdp.send("Page.stopScreencast");
await sleep(300);
const total = (Date.now() - t0) / 1000;
await browser.close();

// ---- encode ---------------------------------------------------------------------------------
// Frames arrive only when the screen changes: give each one the time until the next.
const list = frames.map((f, i) => {
  const next = frames[i + 1]?.t ?? f.t + 0.5;
  return `file '${f.file}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}`;
});
list.push(`file '${frames.at(-1).file}'`);
writeFileSync(join(dir, "list.txt"), list.join("\n"));
execFileSync("ffmpeg", [
  "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
  "-vf", `fps=${FPS},scale=1920:1080:flags=lanczos,format=yuv420p`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-movflags", "+faststart", OUT,
], { stdio: "inherit" });
rmSync(dir, { recursive: true, force: true });
console.log(`Wrote ${OUT} (${frames.length} frames, ${total.toFixed(1)} s)`);
