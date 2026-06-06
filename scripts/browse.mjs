#!/usr/bin/env node
// ---------------------------------------------------------------------------
// browse.mjs — a small, stateful browser that Claude drives step-by-step to
// operate interactive date selectors (and anything else) when ingesting a
// venue. Static fetching (defuddle / WebFetch) can't click a calendar widget;
// this can.
//
// It runs as a background DAEMON holding one Chromium page, plus a thin CLIENT
// that sends it one command at a time over localhost. This shape exists because
// the agent's shell runs each command in a fresh process — the daemon is what
// keeps the page (and its open calendar) alive between commands.
//
// Typical loop (run `serve` in the background first):
//   node scripts/browse.mjs serve            # start daemon (run in background)
//   node scripts/browse.mjs goto <url>       # navigate
//   node scripts/browse.mjs shot calendar    # screenshot -> Read the PNG
//   node scripts/browse.mjs click "Next"     # advance the calendar a month
//   node scripts/browse.mjs eval "<js>"      # read out which days are bookable
//   node scripts/browse.mjs stop             # shut the daemon + browser down
//
// Commands:
//   serve                      start the daemon (foreground; background it)
//   goto <url>                 navigate; waits for load. prints final url+title
//   shot [name] [full]         screenshot to .cache/browse/<name>.png; prints path
//   click "<text|selector>"    click by CSS, else visible text, else aria-label
//   fill "<selector>" "<val>"  type into an input
//   text [selector]            visible innerText (whole page, or one node)
//   html [selector]            outerHTML (inspect calendar markup / aria-labels)
//   eval "<js-expression>"     run JS in the page; prints JSON result
//   status                     is the daemon up, and on what url
//   stop                       close the browser and stop the daemon
//
// Env: BROWSE_HEADFUL=1 to watch the browser; BROWSE_PORT to override the port.
// ---------------------------------------------------------------------------

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, ".cache", "browse");
const PORT_FILE = path.join(CACHE_DIR, "daemon.json");
const PORT = Number(process.env.BROWSE_PORT) || 39271;
const HOST = "127.0.0.1";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function ensureCacheDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Client: send one command to the running daemon and print the result.
// ---------------------------------------------------------------------------
function readPortFile() {
  try {
    return JSON.parse(fs.readFileSync(PORT_FILE, "utf8"));
  } catch {
    return null;
  }
}

function send(cmd, args) {
  return new Promise((resolve, reject) => {
    const info = readPortFile();
    const port = info?.port || PORT;
    const body = JSON.stringify({ cmd, args });
    const req = http.request(
      { host: HOST, port, method: "POST", path: "/", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ ok: false, error: `bad response: ${data.slice(0, 200)}` });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function runClient(cmd, args) {
  if (cmd !== "serve" && !readPortFile()) {
    console.error(
      "browse: daemon not running. Start it in the background first:\n" +
        "  node scripts/browse.mjs serve   (run_in_background: true)"
    );
    process.exit(2);
  }
  let res;
  try {
    res = await send(cmd, args);
  } catch (e) {
    console.error(`browse: could not reach daemon (${e.message}). Is it still running?`);
    process.exit(2);
  }
  if (!res.ok) {
    console.error(`browse: ${res.error || "command failed"}`);
    process.exit(1);
  }
  if (res.message) console.log(res.message);
  if (res.data !== undefined) {
    console.log(typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2));
  }
}

// ---------------------------------------------------------------------------
// Daemon: hold one Chromium page and execute commands against it.
// ---------------------------------------------------------------------------
async function clickSmart(page, target) {
  const tries = [
    { how: "css", locate: () => page.locator(target) },
    { how: "text", locate: () => page.getByText(target, { exact: false }) },
    { how: "aria", locate: () => page.locator(`[aria-label*=${JSON.stringify(target)}]`) },
    { how: "title", locate: () => page.locator(`[title*=${JSON.stringify(target)}]`) },
  ];
  for (const t of tries) {
    try {
      const loc = t.locate();
      if ((await loc.count()) > 0) {
        await loc.first().scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
        await loc.first().click({ timeout: 8000 });
        return t.how;
      }
    } catch {
      /* try next strategy */
    }
  }
  throw new Error(`no clickable element matched: ${target}`);
}

async function serve() {
  ensureCacheDir();
  if (readPortFile()) {
    console.error("browse: a daemon is already running (see .cache/browse/daemon.json). Run `stop` first.");
    process.exit(2);
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: !process.env.BROWSE_HEADFUL });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });
  const page = await context.newPage();

  const handlers = {
    async goto([url]) {
      if (!url) throw new Error("goto needs a url");
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      return { data: { url: page.url(), title: await page.title() } };
    },

    async shot([name, mode]) {
      ensureCacheDir();
      const safe = (name || `shot-${Date.now()}`).replace(/[^a-z0-9_-]/gi, "_");
      const file = path.join(CACHE_DIR, `${safe}.png`);
      await page.screenshot({ path: file, fullPage: mode === "full" });
      return { message: file, data: undefined };
    },

    async click([target]) {
      if (!target) throw new Error("click needs a text or selector");
      const how = await clickSmart(page, target);
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      return { message: `clicked (${how}): ${target}`, data: { url: page.url() } };
    },

    async fill([selector, value]) {
      if (!selector) throw new Error("fill needs a selector and a value");
      await page.locator(selector).first().fill(value ?? "");
      return { message: `filled ${selector}` };
    },

    async text([selector]) {
      let out;
      if (selector) out = await page.locator(selector).first().innerText();
      else out = await page.evaluate(() => document.body.innerText);
      out = out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      const cap = 6000;
      if (out.length > cap) out = out.slice(0, cap) + `\n…(${out.length - cap} more chars truncated)`;
      return { data: out };
    },

    async html([selector]) {
      let out;
      if (selector) out = await page.locator(selector).first().evaluate((el) => el.outerHTML);
      else out = await page.evaluate(() => document.documentElement.outerHTML);
      const cap = 15000;
      if (out.length > cap) out = out.slice(0, cap) + `\n…(${out.length - cap} more chars truncated)`;
      return { data: out };
    },

    async eval([js]) {
      if (!js) throw new Error("eval needs a JS expression");
      const result = await page.evaluate(js);
      return { data: result === undefined ? "undefined" : result };
    },

    async status() {
      return { data: { up: true, url: page.url(), title: await page.title().catch(() => "") } };
    },
  };

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let cmd, args;
      try {
        ({ cmd, args = [] } = JSON.parse(body || "{}"));
      } catch {
        res.end(JSON.stringify({ ok: false, error: "bad request" }));
        return;
      }
      if (cmd === "stop") {
        res.end(JSON.stringify({ ok: true, message: "stopping browser daemon" }));
        await shutdown();
        return;
      }
      const handler = handlers[cmd];
      if (!handler) {
        res.end(JSON.stringify({ ok: false, error: `unknown command: ${cmd}` }));
        return;
      }
      try {
        const out = (await handler(args)) || {};
        res.end(JSON.stringify({ ok: true, ...out }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
  });

  async function shutdown() {
    try {
      fs.rmSync(PORT_FILE, { force: true });
    } catch {}
    try {
      await browser.close();
    } catch {}
    server.close(() => process.exit(0));
    // hard stop if anything lingers
    setTimeout(() => process.exit(0), 1500).unref();
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen(PORT, HOST, () => {
    fs.writeFileSync(PORT_FILE, JSON.stringify({ port: PORT, pid: process.pid }));
    console.log(`browse daemon listening on ${HOST}:${PORT} (headless=${!process.env.BROWSE_HEADFUL}). Ctrl-C or \`stop\` to quit.`);
  });
}

// ---------------------------------------------------------------------------
const [, , cmd, ...args] = process.argv;
if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
  console.log(
    "usage: node scripts/browse.mjs <serve|goto|shot|click|fill|text|html|eval|status|stop> [args]\n" +
      "start `serve` in the background, then drive it. see file header for details."
  );
  process.exit(0);
}
if (cmd === "serve") {
  serve();
} else {
  runClient(cmd, args);
}
