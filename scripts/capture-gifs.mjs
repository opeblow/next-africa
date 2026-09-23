import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
config({ path: path.join(root, "backend", ".env"), override: true });

const DEMO = JSON.parse(process.env.DEMO_JSON || fs.readFileSync(path.join(root, "scripts", "demo.json"), "utf8"));
const OUT = path.join(root, "docs", "assets");
const BASE = "http://localhost:5173";
const WIDTH = 1280;
const HEIGHT = 860;

fs.mkdirSync(OUT, { recursive: true });

function runChild(cmd, args, cwd) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd });
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);
    p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))));
  });
}

async function ffmpegToGif(webm, gif, opts = {}) {
  const fps = opts.fps ?? 12;
  const width = opts.width ?? 640;
  // take a fixed tail from the END (guaranteed to be the target screen)
  const tail = opts.tail ?? 5;
  const pal = webm.replace(/\.webm$/, "-pal.png");
  const lastArgs = ["-vf", `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=max_colors=192`, pal];
  await runChild("ffmpeg", ["-y", "-sseof", `-${tail}`, "-i", webm, ...lastArgs], root);
  await runChild(
    "ffmpeg",
    ["-y", "-sseof", `-${tail}`, "-i", webm, "-i", pal, "-filter_complex", `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`, gif],
    root
  );
  fs.unlinkSync(pal);
  fs.unlinkSync(webm);
}

async function record(name, buildSteps) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    recordVideo: { dir: OUT, size: { width: WIDTH, height: HEIGHT } },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });

  await buildSteps(page, context);

  // keep the last animated frame on screen for a beat, then stop recording
  await page.waitForTimeout(1200);
  const video = page.video();
  await context.close();
  await browser.close();
  const webm = await video.path();
  const gif = path.join(OUT, `${name}.gif`);
  await ffmpegToGif(webm, gif);
  return { gif, bytes: fs.statSync(gif).size };
}

async function getStarted(page) {
  await page.click("button.nav-cta, button.primary:has-text('Get started')");
  await page.waitForSelector("section.auth-card form", { state: "visible" });
}

async function login(page, email, password) {
  // If signup mode is showing, switch to sign in
  const switchBtn = page.locator("button", { hasText: "Sign in" }).first();
  if (await switchBtn.count()) {
    const text = (await switchBtn.textContent()).trim();
    if (text.includes("an account")) {
      await switchBtn.click();
      await page.waitForTimeout(250);
    }
  }
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  const anchor = page.locator("button.auth-submit");
  if ((await anchor.textContent()).includes("Create")) {
    await switchBtn.click();
    await page.waitForTimeout(250);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
  }
  await page.click("button.auth-submit");
  await page.waitForSelector('button:has-text("Today")', { timeout: 15000 });
}

async function main() {
  const jobs = JSON.parse(process.env.JOBS || "[]");
  if (!jobs.length) throw new Error("JOBS env required as JSON array");
  const made = {};

  for (const job of jobs) {
    const { name, login: needsLogin, mode } = job;
    const result = await record(name, async (page) => {
      await page.setViewportSize({ width: WIDTH, height: HEIGHT });
      if (mode === "hero") {
        // auto-cycles through hero floating notes
        await page.waitForTimeout(2400);
        return;
      }
      await getStarted(page);
      if (needsLogin) await login(page, DEMO.email, DEMO.password);
      else {
        // fresh signup for capture/execute so the loop runs from scratch
        await page.fill('input[name="name"]', "Ada Nwosu");
        const stamp = Date.now();
        await page.fill('input[name="email"]', `ada${stamp}@next.local`);
        await page.fill('input[name="password"]', "ada-password-2026");
        await page.click("button.auth-submit");
        await page.waitForSelector('button:has-text("Today")', { timeout: 15000 });
      }

      if (mode === "capture") {
        await page.click('nav button:has-text("Chat")');
        await page.waitForSelector("textarea");
        const msg = "I need to send the client proposal before Thursday at 2, then confirm the venue with John.";
        await page.fill("textarea", msg);
        await page.click("button[type=submit]");
        await page.waitForSelector(".confirmation .extracted-item", { timeout: 20000 });
        await page.waitForTimeout(1800);
      } else if (mode === "execute") {
        // run capture then loop screens, stopping on the animated execution view
        await page.click('nav button:has-text("Chat")');
        await page.waitForSelector("textarea");
        const msg = "Plan the festival: book the band, finalise the flyer, send it to the printers by Friday.";
        await page.fill("textarea", msg);
        await page.click("button[type=submit]");
        await page.waitForSelector(".confirmation .extracted-item", { timeout: 20000 });
        await page.click('button:has-text("Proceed to Task Analysis"), button:has-text("Build my plan")');
        await page.waitForTimeout(1200);
        const buildBtn = page.locator('button:has-text("Build my plan")');
        if (await buildBtn.count()) await buildBtn.click();
        await page.waitForTimeout(1200);
        await page.click('button:has-text("Yes, start")');
        await page.waitForSelector(".execute-progress-bar, .radar-ring", { timeout: 8000 });
        await page.waitForTimeout(4200);
      } else if (mode === "today") {
        await page.click('nav button:has-text("Today")');
        await page.waitForSelector(".dashboard-columns, .today-dot", { timeout: 10000 });
        await page.waitForTimeout(2200);
      } else if (mode === "nudges") {
        await page.click('nav button:has-text("Nudges")');
        await page.waitForSelector(".nudge-card", { timeout: 10000 });
        await page.waitForTimeout(2600);
      }
    });
    made[name] = `${path.relative(root, result.gif).replace(/\\/g, "/")}`;
    console.log(`✓ ${name} -> ${made[name]} (${(result.bytes / 1024).toFixed(0)} KB)`);
  }
  return made;
}

const made = await main();
fs.writeFileSync(path.join(__dirname, "gifs.json"), JSON.stringify(made, null, 2));
process.exit(0);