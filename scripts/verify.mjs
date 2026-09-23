import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const backendDir = path.join(root, "backend");
const envFile = path.join(backendDir, ".env");

for (const name of ["DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY"]) {
  if (process.env[name]) continue;
  if (existsSync(envFile)) {
    const match = readFileSync(envFile, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (match) process.env[name] = match[1];
  }
}

const results = [];
const startedAt = Date.now();

function run(name, bin, args, { cwd = root, shell = false } = {}) {
  const res = spawnSync(bin, args, { cwd, shell, stdio: ["inherit", "pipe", "pipe"], encoding: "utf8" });
  const ok = res.status === 0;
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok && (res.stdout || res.stderr || res.error)) {
    const detail = res.error?.message || (res.stderr || res.stdout).split(/\r?\n/).filter(Boolean).slice(-8).join("\n");
    if (detail) console.log("  " + detail.replaceAll("\n", "\n  "));
  }
  return res;
}

const npmCandidates = [
  path.join(root, "node_modules", "npm", "bin", "npm-cli.js"),
  path.join(root, "node_modules", "npm", "lib", "cli.js"),
  path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
];
const npmCli = npmCandidates.find((p) => existsSync(p));

function runNpm(name, args, opts = {}) {
  return run(name, process.execPath, [npmCli, ...args], opts);
}

console.log("= NEXT Africa production-readiness verification =");

runNpm("migrations apply cleanly (db:setup)", ["run", "db:setup"]);

const coverage = run("backend tests + coverage", process.execPath, ["--test", "--experimental-test-coverage"], { cwd: backendDir });
if (coverage.status === 0) {
  const out = `${coverage.stdout ?? ""}\n${coverage.stderr ?? ""}`;
  const tests = out.match(/^ℹ tests\s+(\d+)/m);
  const pctRows = [...out.matchAll(/\|\s*([\d.]+)%\s*\|\s*([\d.]+)%\s*\|\s*([\d.]+)%/g)];
  let linePct = pctRows[pctRows.length - 1]?.[1];
  let branchPct = pctRows[pctRows.length - 1]?.[2];
  if (!linePct) {
    const tokens = [...out.matchAll(/\b(\d+(?:\.\d+))%\b/g)].map((m) => m[1]);
    linePct = tokens[tokens.length - 3];
    branchPct = tokens[tokens.length - 2];
  }
  const detail = [
    tests ? `tests: ${tests[1]}` : null,
    linePct ? `line: ${linePct}%` : null,
    branchPct ? `branch: ${branchPct}%` : null,
  ].filter(Boolean).join("  ");
  if (detail) console.log(`  ${detail}`);
}

runNpm("eslint (no errors)", ["run", "lint"]);

runNpm("frontend production build", ["run", "build", "-w", "frontend"]);

console.log("= live probe (expect 200s; start `npm run dev` if skipped) =");
for (const pathname of ["/api/health", "/api/live", "/api/ready", "/api/openapi.json", "/api/docs"]) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://localhost:3001${pathname}`, { signal: controller.signal });
    clearTimeout(timer);
    console.log(`${res.status}  GET ${pathname}`);
  } catch {
    console.log("SKIP  GET " + pathname);
  }
}

const ok = results.every((r) => r.ok);
console.log(`= ${ok ? "ALL CHECKS PASS" : "SOME CHECKS FAILED"} (${(Date.now() - startedAt) / 1000}s) =`);
process.exitCode = ok ? 0 : 1;