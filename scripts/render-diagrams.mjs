import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUT = path.join(root, "docs", "assets");
const DIAGS = path.join(__dirname, "diagrams");

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
  const width = opts.width ?? 900;
  const tail = opts.tail ?? 5.5;
  const pal = webm.replace(/\.webm$/, "-pal.png");
  await runChild("ffmpeg", ["-y", "-sseof", `-${tail}`, "-i", webm, "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=max_colors=192`, pal], root);
  await runChild(
    "ffmpeg",
    ["-y", "-sseof", `-${tail}`, "-i", webm, "-i", pal, "-filter_complex", `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`, gif],
    root
  );
  fs.unlinkSync(pal);
  fs.unlinkSync(webm);
}

async function record(name, file, waitMs, opts = {}) {
  const browser = await chromium.launch();
  const WIDTH = opts.viewW ?? 1400, HEIGHT = opts.viewH ?? 880;
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    recordVideo: { dir: OUT, size: { width: WIDTH, height: HEIGHT } },
  });
  const page = await context.newPage();
  await page.goto("file://" + path.join(DIAGS, file).replace(/\\/g, "/") + (opts.query ? "?" + opts.query : ""), { waitUntil: "load" });
  await page.waitForTimeout(waitMs);
  const video = page.video();
  await context.close();
  await browser.close();
  const webm = await video.path();
  const gif = path.join(OUT, `${name}.gif`);
  await ffmpegToGif(webm, gif, opts);
  return { gif, bytes: fs.statSync(gif).size };
}

async function snap(name, file, fileRoot, waitMs, viewW, viewH) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: viewW, height: viewH } });
  const page = await context.newPage();
  await page.goto("file://" + path.join(DIAGS, file).replace(/\\/g, "/"), { waitUntil: "load" });
  await page.waitForTimeout(waitMs);
  const out = path.join(fileRoot, `${name}.png`);
  await page.screenshot({ path: out });
  await context.close();
  await browser.close();
  return { png: out, bytes: fs.statSync(out).size };
}

const arch = await record("011-architecture", "architecture.html", 12000, { tail: 8.5, width: 900 });
console.log(`✓ architecture -> ${path.relative(root, arch.gif)} (${(arch.bytes / 1024).toFixed(0)} KB)`);

const flow = await record("012-product-flow", "product-flow.html", 6000, { tail: 6.2, viewW: 1000, viewH: 1320, width: 480 });
console.log(`✓ product-flow -> ${path.relative(root, flow.gif)} (${(flow.bytes / 1024).toFixed(0)} KB)`);

const staticFlow = await snap("012-product-flow-chart", "product-flow.html?static", OUT, 600, 1000, 1320);
console.log(`✓ product-flow-chart -> ${path.relative(root, staticFlow.png).replace(/\\/g, "/")} (${(staticFlow.bytes / 1024).toFixed(0)} KB)`);

process.exit(0);