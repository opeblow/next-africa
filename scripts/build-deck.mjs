/**
 * Builds the hackathon slide deck.
 *
 * Screenshots live in docs/assets/deck (capture them with the live site), and
 * the flow recordings in docs/assets. Run with: node scripts/build-deck.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import PptxGenJS from "pptxgenjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const deckAssets = path.join(root, "docs", "assets", "deck");
const outFile = path.join(root, "docs", "NEXT-Africa-Deck.pptx");

const INK = "1D263F";
const PURPLE = "5C4DE2";
const PURPLE_SOFT = "EFEDFF";
const MUTED = "6E7486";
const LINE = "E4E2EE";
const PAPER = "FFFFFF";
const MIST = "F7F7FB";
const FONT = "Segoe UI";

const SITE = "https://next-africa.pages.dev";
const API = "https://next-africa.onrender.com";

/** Intrinsic size of a PNG or GIF so images can be scaled without distortion. */
function imageSize(file) {
  const b = readFileSync(file);
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.slice(0, 3).toString() === "GIF") return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  return { w: 1440, h: 900 };
}

/** Fit a box inside a frame, preserving aspect ratio, centred. */
function fit(file, box) {
  const { w, h } = imageSize(file);
  const scale = Math.min(box.w / w, box.h / h);
  const dw = w * scale;
  const dh = h * scale;
  return { x: box.x + (box.w - dw) / 2, y: box.y + (box.h - dh) / 2, w: dw, h: dh };
}

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.title = "NEXT Africa - a personal execution copilot";
pres.author = "Mobolaji Opeyemi Bolatito, Oluwatamilore Paul Olubanwo";
pres.subject = "Borderless Bytes Hackathon";

const W = 13.333;
const H = 7.5;
const M = 0.85;
const FOOT = "NEXT Africa  |  Borderless Bytes Hackathon";

let slideNo = 0;

function chrome(slide, { dark = false } = {}) {
  const fg = dark ? "FFFFFF" : INK;
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.06, fill: { color: PURPLE }, line: { width: 0 },
  });
  slide.addText(FOOT, {
    x: M, y: H - 0.52, w: 6, h: 0.3, fontSize: 9, color: dark ? "9AA3BF" : "9AA0B2", fontFace: FONT,
  });
  slide.addText(String(slideNo).padStart(2, "0"), {
    x: W - M - 0.8, y: H - 0.52, w: 0.8, h: 0.3, fontSize: 9, align: "right",
    color: dark ? "9AA3BF" : "9AA0B2", fontFace: FONT,
  });
  return fg;
}

function newSlide({ dark = false, bg } = {}) {
  const slide = pres.addSlide();
  slide.background = { color: bg || (dark ? INK : PAPER) };
  slideNo += 1;
  chrome(slide, { dark });
  return slide;
}

/** Section opener: big number + title, used to break the deck into acts. */
function sectionSlide(kicker, title, sub, file) {
  const s = newSlide({ dark: true });
  const textW = file ? 5.9 : 10.5;
  s.addText(kicker.toUpperCase(), {
    x: M, y: 2.5, w: 6, h: 0.35, fontSize: 12, bold: true, color: "9F8CFF", charSpacing: 2, fontFace: FONT,
  });
  s.addText(title, { x: M, y: 2.95, w: textW, h: 1.6, fontSize: file ? 32 : 40, bold: true, color: PAPER, fontFace: FONT });
  if (sub) s.addText(sub, { x: M, y: 4.35, w: textW - 0.3, h: 1.1, fontSize: 14, color: "B9C0D8", fontFace: FONT });
  if (file) {
    const p = fit(file, { x: 7.35, y: 1.15, w: 5.15, h: 5.2 });
    s.addShape(pres.ShapeType.rect, {
      x: p.x - 0.07, y: p.y - 0.07, w: p.w + 0.14, h: p.h + 0.14,
      fill: { color: "232D4B" }, line: { color: "39456B", width: 1 },
    });
    s.addImage({ path: file, ...p });
  }
  return s;
}

function heading(slide, kicker, title, sub) {
  slide.addText(kicker.toUpperCase(), {
    x: M, y: 0.5, w: 8, h: 0.3, fontSize: 10.5, bold: true, color: PURPLE, charSpacing: 1.6, fontFace: FONT,
  });
  slide.addText(title, { x: M, y: 0.82, w: 11.4, h: 0.72, fontSize: 30, bold: true, color: INK, fontFace: FONT });
  if (sub) slide.addText(sub, { x: M, y: 1.55, w: 10.9, h: 0.62, fontSize: 13, color: MUTED, fontFace: FONT });
  slide.addShape(pres.ShapeType.line, {
    x: M, y: 1.5, w: 0.9, h: 0, line: { color: PURPLE, width: 2.5 },
  });
}

function bullets(slide, items, opts = {}) {
  const { x = M, y = 2.1, w = 11.6, gap = 0.62, size = 14.5 } = opts;
  items.forEach((it, i) => {
    const yy = y + i * gap;
    slide.addShape(pres.ShapeType.ellipse, {
      x, y: yy + 0.09, w: 0.13, h: 0.13, fill: { color: PURPLE }, line: { width: 0 },
    });
    slide.addText(it, {
      x: x + 0.32, y: yy - 0.04, w: w - 0.32, h: gap, fontSize: size, color: INK, fontFace: FONT, valign: "top",
    });
  });
}

/** Card grid used for personas, pillars and the stack. */
function cards(slide, items, opts = {}) {
  const { x = M, y = 2.2, w = 11.6, h = 1.5, cols = 2, gapx = 0.35, gapy = 0.3 } = opts;
  const cw = (w - gapx * (cols - 1)) / cols;
  items.forEach((it, i) => {
    const cx = x + (i % cols) * (cw + gapx);
    const cy = y + Math.floor(i / cols) * (h + gapy);
    slide.addShape(pres.ShapeType.roundRect, {
      x: cx, y: cy, w: cw, h, rectRadius: 0.06,
      fill: { color: it.fill || MIST }, line: { color: it.line || LINE, width: 1 },
    });
    slide.addText(it.title, {
      x: cx + 0.28, y: cy + 0.2, w: cw - 0.56, h: 0.34, fontSize: 13.5, bold: true, color: it.accent || INK, fontFace: FONT,
    });
    slide.addText(it.body, {
      x: cx + 0.28, y: cy + 0.58, w: cw - 0.56, h: h - 0.75, fontSize: 11.5, color: MUTED, fontFace: FONT, valign: "top",
    });
  });
}

/** Screenshot slide: copy on the left, the product on the right. */
function shotSlide({ kicker, title, sub, file, points, box }) {
  const s = newSlide();
  heading(s, kicker, title, sub);
  const imgBox = box || { x: 6.55, y: 2.05, w: 5.95, h: 4.1 };
  const p = fit(file, imgBox);
  s.addShape(pres.ShapeType.rect, {
    x: p.x - 0.06, y: p.y - 0.06, w: p.w + 0.12, h: p.h + 0.12,
    fill: { color: PAPER }, line: { color: LINE, width: 1 }, shadow: { type: "outer", blur: 18, offset: 3, angle: 90, color: "9AA0B2", opacity: 0.28 },
  });
  s.addImage({ path: file, ...p });
  bullets(s, points, { x: M, y: 2.3, w: 5.4, gap: 0.95, size: 13 });
  s.addNotes(`${title} - live build at ${SITE}`);
  return s;
}

/* ------------------------------------------------------------------ 1 title */
{
  const s = newSlide({ dark: true, bg: INK });
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.09, fill: { color: PURPLE }, line: { width: 0 } });
  s.addText("BORDERLESS BYTES HACKATHON", {
    x: M, y: 1.15, w: 8, h: 0.32, fontSize: 11.5, bold: true, color: "9F8CFF", charSpacing: 2.4, fontFace: FONT,
  });
  s.addText("NEXT Africa", { x: M, y: 1.62, w: 11, h: 1.15, fontSize: 62, bold: true, color: PAPER, fontFace: FONT });
  s.addText("a personal execution copilot", {
    x: M, y: 2.78, w: 11, h: 0.6, fontSize: 25, color: "C9CEE4", fontFace: FONT,
  });
  s.addShape(pres.ShapeType.line, { x: M, y: 3.62, w: 1.1, h: 0, line: { color: PURPLE, width: 3 } });
  s.addText(
    "Tell it what matters in the same words you would use in a WhatsApp message.\nIt turns the promise into a dated commitment, then follows through until it is done.",
    { x: M, y: 3.95, w: 7.5, h: 1.2, fontSize: 14.5, color: "AEB6D0", lineSpacingMultiple: 1.3, fontFace: FONT },
  );
  s.addText(
    [
      { text: "Mobolaji Opeyemi Bolatito", options: { bold: true, color: PAPER } },
      { text: "  Developer\n", options: { color: "8F97B5" } },
      { text: "Oluwatamilore Paul Olubanwo", options: { bold: true, color: PAPER } },
      { text: "  Product Manager", options: { color: "8F97B5" } },
    ],
    { x: M, y: 5.55, w: 6, h: 0.8, fontSize: 12.5, lineSpacingMultiple: 1.35, fontFace: FONT },
  );
  s.addShape(pres.ShapeType.roundRect, {
    x: 8.5, y: 4.3, w: 3.95, h: 1.5, rectRadius: 0.08,
    fill: { color: "232D4B" }, line: { color: "39456B", width: 1 },
  });
  s.addText("LIVE BUILD", { x: 8.82, y: 4.55, w: 3.3, h: 0.28, fontSize: 10, bold: true, color: "9F8CFF", charSpacing: 1.6, fontFace: FONT });
  s.addText(SITE.replace("https://", ""), { x: 8.82, y: 4.86, w: 3.4, h: 0.34, fontSize: 14, bold: true, color: PAPER, fontFace: FONT });
  s.addText("API + docs: " + API.replace("https://", ""), { x: 8.82, y: 5.24, w: 3.4, h: 0.34, fontSize: 10.5, color: "8F97B5", fontFace: FONT });
  s.addText(FOOT, { x: M, y: H - 0.52, w: 6, h: 0.3, fontSize: 9, color: "6C7594", fontFace: FONT });
}

/* ---------------------------------------------------------------- 2 problem */
{
  const s = newSlide();
  heading(s, "The problem", "Work here runs on conversation, not calendars",
    "Across Africa the commitment is real and binding - and it is living in a chat thread with 400 other messages.");
  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 2.25, w: 11.6, h: 1.15, rectRadius: 0.06, fill: { color: PURPLE_SOFT }, line: { color: "DCD7FF", width: 1 },
  });
  s.addText('"send the proposal before the Thursday meeting"  -  "remind me to follow up with Dana"', {
    x: M + 0.35, y: 2.25, w: 10.9, h: 1.15, fontSize: 15, italic: true, color: "463C9E", valign: "middle", fontFace: FONT,
  });
  cards(s, [
    { title: "Calendar-first apps", body: "Assume you block time deliberately. Our users negotiate the day in the moment." },
    { title: "Task managers", body: "Assume a desktop and steady bandwidth. Data cost and patchy signal are real." },
    { title: "Email workflows", body: "Assume email is the record of work. Threads and voice notes carry the load." },
    { title: "Enterprise PM tools", body: "Priced for salaried teams. Our users are students, traders and solo operators." },
  ], { y: 3.6, h: 1.32, cols: 2 });
  s.addNotes("Existing tools were not built for this user. None of them start from a WhatsApp message.");
}

/* -------------------------------------------------------------- 3 audience */
{
  const s = newSlide();
  heading(s, "Target audience", "Who this is built for",
    "One shared reality: the work arrives as conversation, on a phone, in another language than the software.");
  cards(s, [
    { title: "Amina, 24 - fashion freelancer, Lagos", body: "Client messages and voice notes while hand-sewing. Cannot sit at a laptop mid-work, and a calendar assumes she already knows tomorrow hour by hour.", accent: PURPLE, fill: PURPLE_SOFT, line: "DCD7FF" },
    { title: "Tunde, 31 - trader, Onitsha market", body: "Verbal requests side by side, stock deadlines, payment promises. Task apps need constant typing; his commitments are spoken.", accent: PURPLE, fill: PURPLE_SOFT, line: "DCD7FF" },
    { title: "Chioma, 19 - undergrad, Ibadan", body: "Group chats, forwarded PDFs, lecturer announcements. Nothing turns \"the EOF document is due Thursday\" into a dated, linked task.", accent: PURPLE, fill: PURPLE_SOFT, line: "DCD7FF" },
    { title: "Dr. Bola, 45 - clinic owner", body: "Patients, vendors and staff promises over WhatsApp. Enterprise tools are priced for teams, not for a solo operator.", accent: PURPLE, fill: PURPLE_SOFT, line: "DCD7FF" },
  ], { y: 2.2, h: 1.6, cols: 2 });
  s.addText("Designed Africa-first: mobile-first, low-data, WhatsApp-native.", {
    x: M, y: 6.05, w: 11.6, h: 0.35, fontSize: 12.5, bold: true, color: PURPLE, fontFace: FONT,
  });
  s.addNotes("Personas are drawn from docs/PROBLEM-FIT.md, mapped to real feature moments.");
}

/* -------------------------------------------------------------- 4 solution */
sectionSlide("The solution", "It hears the promise, then makes it happen",
  "Say it once, in your own words. NEXT structures it, dates it, and keeps the follow-through moving.",
  path.join(deckAssets, "01-landing.png"));

/* ---------------------------------------------------------------- 5 capture */
shotSlide({
  kicker: "Product - 01",
  title: "Capture in the words you already use",
  sub: "Type, attach a file, or send a voice note. It comes out as structured, dated commitments.",
  file: path.join(deckAssets, "04-capture.png"),
  points: [
    "One message becomes several commitments, each with a real date and type",
    "Up to 100 recent commitments are private context, so \"it\" and \"the venue\" resolve to the right thing",
    "PDF, image, TXT, Markdown and CSV attachments up to 8 MB; voice is transcribed into the same pipeline",
  ],
});

/* ---------------------------------------------------------------- 6 today */
shotSlide({
  kicker: "Product - 02",
  title: "Today is the only board that matters",
  sub: "A morning board, the waiting list, and live project progress - all data-driven, nothing fabricated.",
  file: path.join(deckAssets, "03-today.png"),
  points: [
    "Today, waiting-for and projects side by side, on one screen",
    "Edit a deadline, prepare a follow-up draft, and mark work done or waiting",
    "Progress is recorded status - never a timer pretending work happened",
  ],
});

/* --------------------------------------------------------------- 7 nudges */
shotSlide({
  kicker: "Product - 03",
  title: "It follows up, so you do not have to",
  sub: "Proactive nudges surface what is due, what is blocked, and what is waiting on someone else.",
  file: path.join(deckAssets, "06-nudges.png"),
  points: [
    "Waiting items resurface until they are resolved, then stop",
    "Due windows follow your proactivity level: quiet 24h, balanced 48h, active 7 days",
    "Opt-in Web Push sends a private daily summary with durable delivery records",
  ],
});

/* -------------------------------------------------------------- 8 projects */
shotSlide({
  kicker: "Product - 04",
  title: "Projects assemble themselves",
  sub: "A promise made across five days and three chats is auto-linked into one project with progress.",
  file: path.join(deckAssets, "05-projects.png"),
  points: [
    "Cross-message linking turns loose commitments into one trackable project",
    "Stage, owner and due tags stay visible without a project-management seat",
    "Built for a solo operator, not a salaried team",
  ],
});

/* ------------------------------------------------------------ 9 execution */
{
  const s = newSlide();
  heading(s, "Product - 05", "From approval to done, step by step",
    "The loop you approved, worked through with live progress - this is where a \"will do later\" sentence stops dying in a thread.");
  const f = path.join(root, "docs", "assets", "005-execute.gif");
  const p = fit(f, { x: 4.4, y: 2.1, w: 8.05, h: 4.15 });
  s.addShape(pres.ShapeType.rect, {
    x: p.x - 0.06, y: p.y - 0.06, w: p.w + 0.12, h: p.h + 0.12,
    fill: { color: PAPER }, line: { color: LINE, width: 1 }, shadow: { type: "outer", blur: 18, offset: 3, angle: 90, color: "9AA0B2", opacity: 0.28 },
  });
  s.addImage({ path: f, ...p });
  bullets(s, [
    "Understand, plan, decide, follow through, review",
    "You approve the plan before anything runs",
    "Every step is visible and recorded",
  ], { x: M, y: 2.4, w: 3.3, gap: 1.0, size: 12.5 });
  s.addNotes("Live recording from the deployed build - the execution loop running end to end.");
}

/* ------------------------------------------------------------- 10 settings */
shotSlide({
  kicker: "Product - 06",
  title: "Tone is the user's call",
  sub: "\"Remind me, but do not nag me\" is a setting, not a personality test.",
  file: path.join(deckAssets, "07-settings.png"),
  points: [
    "Quiet, balanced and active change the due window and waiting follow-ups",
    "\"Remind me tomorrow\" snoozes for 24 hours",
    "Dates use the timezone chosen in settings, Africa/Lagos by default",
  ],
});

/* --------------------------------------------------------- 11 architecture */
{
  const s = newSlide();
  heading(s, "Under the hood", "A small, honest architecture",
    "Three deployable pieces. No queue, no cluster, no vendor lock - and no claim we cannot demonstrate.");
  cards(s, [
    { title: "Frontend - React 19 + Vite 8", body: "State-based SPA, low-data by design, deployed on Cloudflare Pages. Talks to the API over a single base URL.", accent: PURPLE },
    { title: "Backend - Node 24 + Express 5", body: "REST API with JWT auth, zod validation, helmet, rate limiting and pino logging. Deployed on Render.", accent: PURPLE },
    { title: "Database - PostgreSQL 17", body: "Users, commitments, projects, nudges and push records, with indexes and FK constraints. Migrations apply on boot.", accent: PURPLE },
    { title: "Intelligence - OpenAI", body: "GPT-4o mini for structured extraction via tool calls, Whisper-1 for voice. Timeouts and retries are configured.", accent: PURPLE },
  ], { y: 2.2, h: 1.42, cols: 2 });
  s.addText("Auth is stateless JWT, so any instance can serve any request and horizontal scaling stays trivial.", {
    x: M, y: 5.55, w: 11.6, h: 0.4, fontSize: 12.5, bold: true, color: PURPLE, fontFace: FONT,
  });
}

/* ---------------------------------------------------------------- 12 stack */
{
  const s = newSlide();
  heading(s, "Tech stack", "Everything we used, and why",
    "Boring, current, and chosen so a teammate could read it on day one.");
  const groups = [
    { label: "Frontend", items: "React 19, Vite 8, Tailwind CSS 4, Playwright" },
    { label: "Backend", items: "Node 24, Express 5, zod, pino, helmet, express-rate-limit" },
    { label: "Data", items: "PostgreSQL 17, pg, SQL migrations, JWT (jsonwebtoken), bcrypt" },
    { label: "AI", items: "OpenAI GPT-4o mini, Whisper-1, tool-call extraction" },
    { label: "Platform", items: "Cloudflare Pages, Render, Render Postgres, Web Push (VAPID)" },
    { label: "Tooling", items: "npm workspaces, ESLint 10, Prettier, commitlint, GitHub Actions CI" },
  ];
  groups.forEach((g, i) => {
    const cx = M + (i % 2) * 5.95;
    const cy = 2.2 + Math.floor(i / 2) * 1.42;
    s.addShape(pres.ShapeType.roundRect, {
      x: cx, y: cy, w: 5.65, h: 1.2, rectRadius: 0.05,
      fill: { color: i % 2 ? MIST : PURPLE_SOFT }, line: { color: i % 2 ? LINE : "DCD7FF", width: 1 },
    });
    s.addText(g.label.toUpperCase(), { x: cx + 0.26, y: cy + 0.17, w: 5.1, h: 0.26, fontSize: 9.5, bold: true, color: PURPLE, charSpacing: 1.4, fontFace: FONT });
    s.addText(g.items, { x: cx + 0.26, y: cy + 0.48, w: 5.15, h: 0.62, fontSize: 12, color: INK, fontFace: FONT });
  });
}

/* ------------------------------------------------------------ 13 integrity */
{
  const s = newSlide({ dark: true });
  heading(s, "What it does not do", "The honest limitations slide",
    "Every one of these is a deliberate boundary, stated in the README and in the code.");
  const limits = [
    "No autonomous task execution and no message sending. Drafts are prepared for your review and stay unsent.",
    "Progress is based on saved statuses, never a timer. We do not simulate work that did not happen.",
    "AI calls need a real OPENAI_API_KEY. Our automated tests stub them, and we never present mocked calls as live.",
    "Browser push needs VAPID keys and a secure origin. Reminders are a best-effort summary, not an alarm service.",
    "Google sign-in is not offered. Email and password only, with bcrypt hashing and signed sessions.",
  ];
  limits.forEach((t, i) => {
    const y = 2.25 + i * 0.78;
    s.addShape(pres.ShapeType.roundRect, {
      x: M, y, w: 11.6, h: 0.62, rectRadius: 0.04, fill: { color: "232D4B" }, line: { color: "39456B", width: 1 },
    });
    s.addText(String(i + 1).padStart(2, "0"), { x: M + 0.24, y, w: 0.5, h: 0.62, fontSize: 13, bold: true, color: "9F8CFF", valign: "middle", fontFace: FONT });
    s.addText(t, { x: M + 0.8, y, w: 10.5, h: 0.62, fontSize: 12, color: "C6CCE2", valign: "middle", fontFace: FONT });
  });
  s.addText("Judges: ask us to break any of these claims. We will show you the code.", {
    x: M, y: 6.35, w: 11.6, h: 0.35, fontSize: 12.5, italic: true, color: "8F97B5", fontFace: FONT,
  });
  s.addNotes("This slide is deliberate. It is the fastest way to earn trust in Q and A.");
}

/* ------------------------------------------------------------ 14 traction */
{
  const s = newSlide();
  heading(s, "Status", "Shipped, deployed, and usable today",
    "Not a prototype on a laptop. This is the live build the demo runs against.");
  const rows = [
    ["Live app", SITE, "Cloudflare Pages, mobile-first"],
    ["Live API", API, "Render web service, health-checked"],
    ["API docs", `${API}/api/docs`, "Interactive, generated from the running app"],
    ["Database", "Render PostgreSQL", "Migrations applied, demo data seeded"],
    ["Tests", "26 passing", "node:test, covering auth, dates, files and dedupe"],
  ];
  rows.forEach((r, i) => {
    const y = 2.2 + i * 0.72;
    s.addShape(pres.ShapeType.roundRect, {
      x: M, y, w: 11.6, h: 0.6, rectRadius: 0.04, fill: { color: i % 2 ? MIST : PAPER }, line: { color: LINE, width: 1 },
    });
    s.addText(r[0], { x: M + 0.26, y, w: 2.3, h: 0.6, fontSize: 12, bold: true, color: INK, valign: "middle", fontFace: FONT });
    s.addText(r[1], { x: M + 2.7, y, w: 5.4, h: 0.6, fontSize: 11.5, color: PURPLE, valign: "middle", fontFace: FONT });
    s.addText(r[2], { x: M + 8.2, y, w: 3.2, h: 0.6, fontSize: 11, color: MUTED, valign: "middle", fontFace: FONT });
  });
  s.addText("Demo account is seeded so a judge can log in without setup.", {
    x: M, y: 6.0, w: 11.6, h: 0.35, fontSize: 12, italic: true, color: MUTED, fontFace: FONT,
  });
}

/* ----------------------------------------------------------------- 15 ask */
{
  const s = newSlide({ dark: true, bg: INK });
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.09, fill: { color: PURPLE }, line: { width: 0 } });
  s.addText("WHAT COMES NEXT", { x: M, y: 1.05, w: 8, h: 0.32, fontSize: 11.5, bold: true, color: "9F8CFF", charSpacing: 2.2, fontFace: FONT });
  s.addText("Roadmap", { x: M, y: 1.45, w: 10, h: 0.9, fontSize: 40, bold: true, color: PAPER, fontFace: FONT });
  const steps = [
    ["Now", "Working capture-to-done loop, live on the public internet"],
    ["Next", "WhatsApp bot intake, so the promise never has to leave the chat"],
    ["Then", "Local languages and offline-first sync for low-data users"],
    ["Later", "Team and SME tiers for clinics, traders and small studios"],
  ];
  steps.forEach((st, i) => {
    const y = 2.75 + i * 0.72;
    s.addShape(pres.ShapeType.ellipse, { x: M, y: y + 0.06, w: 0.16, h: 0.16, fill: { color: PURPLE }, line: { width: 0 } });
    if (i < steps.length - 1) s.addShape(pres.ShapeType.line, { x: M + 0.08, y: y + 0.24, w: 0, h: 0.5, line: { color: "3B4670", width: 1.5 } });
    s.addText(st[0], { x: M + 0.42, y: y - 0.06, w: 1.1, h: 0.34, fontSize: 12, bold: true, color: "9F8CFF", fontFace: FONT });
    s.addText(st[1], { x: M + 1.6, y: y - 0.06, w: 9.6, h: 0.34, fontSize: 13, color: "C6CCE2", fontFace: FONT });
  });
  s.addShape(pres.ShapeType.line, { x: M, y: 5.95, w: 11.6, h: 0, line: { color: "39456B", width: 1 } });
  s.addText("NEXT Africa", { x: M, y: 6.1, w: 5, h: 0.5, fontSize: 22, bold: true, color: PAPER, fontFace: FONT });
  s.addText("Tell it what matters. It makes sure it happens.", { x: M, y: 6.58, w: 7, h: 0.35, fontSize: 12.5, color: "8F97B5", fontFace: FONT });
  s.addText([
    { text: SITE, options: { color: "9F8CFF", bold: true } },
    { text: "\n" + API, options: { color: "6C7594" } },
  ], { x: 8.4, y: 6.1, w: 4.05, h: 0.7, fontSize: 11.5, align: "right", fontFace: FONT });
  s.addText(FOOT, { x: M, y: H - 0.52, w: 6, h: 0.3, fontSize: 9, color: "6C7594", fontFace: FONT });
}

mkdirSync(path.dirname(outFile), { recursive: true });
await pres.writeFile({ fileName: outFile });
writeFileSync(outFile + ".path", outFile);
console.log("wrote", path.relative(root, outFile), `(${slideNo} slides)`);
