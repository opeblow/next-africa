import { execSync } from "child_process";

const MESSAGES = {
  ".editorconfig": "chore: add editorconfig for consistent editor style",
  ".gitignore": "chore: ignore secrets, build output, test artifacts and diagram temp files",
  ".nvmrc": "chore: pin node version",
  ".prettierignore": "chore: add prettier ignore list",
  ".prettierrc.json": "chore: add prettier config",
  ".github/CODEOWNERS": "chore: declare code owners",
  ".github/PULL_REQUEST_TEMPLATE.md": "docs: add pull request template",
  ".github/ISSUE_TEMPLATE/bug_report.md": "docs: add bug report template",
  ".github/ISSUE_TEMPLATE/feature_request.md": "docs: add feature request template",
  ".github/workflows/ci.yml": "ci: add continuous integration pipeline",
  ".github/workflows/cd.yml": "ci: add continuous deployment pipeline",
  "CHANGELOG.md": "docs: add changelog",
  "CODE_OF_CONDUCT.md": "docs: add code of conduct",
  "CONNECTION.md": "docs: document connection and collaboration details",
  "CONTRIBUTING.md": "docs: add contributing guide",
  "LICENSE": "docs: add license",
  "README.md": "docs: add hero, key screen, architecture and product flow visuals with correct repo links",
  "SECURITY.md": "docs: add security policy",
  "NEXT_Africa_Personal_Execution_Copilot_Hackathon_Concept.docx": "docs: add hackathon concept document",
  "commitlint.config.js": "chore: add commitlint config",
  "eslint.config.js": "chore: add eslint config",
  "package.json": "chore: add root package.json with scripts",
  "package-lock.json": "chore: add root lockfile",

  "backend/.env.example": "chore: add backend environment template",
  "backend/package.json": "chore: add backend package manifest",
  "backend/migrations/0001_init.sql": "db: add initial schema migration",
  "backend/migrations/0002_performance_indexes.sql": "db: add performance index migration",
  "backend/src/app.js": "feat: compose backend express app with routes and middleware",
  "backend/src/config.js": "feat: centralise backend configuration",
  "backend/src/server.js": "feat: add backend server entrypoint",
  "backend/src/openapi.js": "docs: define openapi specification reference",
  "backend/src/db/migrate.js": "feat: add migration runner",
  "backend/src/db/pool.js": "feat: add postgres connection pool",
  "backend/src/db/schema.js": "feat: define database schema in code",
  "backend/src/db/seed.js": "feat: add database seeding",
  "backend/src/db/setup.js": "feat: add database setup helper",
  "backend/src/lib/logger.js": "feat: add structured logger",
  "backend/src/lib/pagination.js": "feat: add pagination helper",
  "backend/src/lib/validate.js": "feat: add request validation helper",
  "backend/src/llm/extract.js": "feat: extract commitments via openai tool calling",
  "backend/src/middleware/auth.js": "feat: add jwt auth middleware",
  "backend/src/middleware/errorHandler.js": "feat: add error handler middleware",
  "backend/src/middleware/requestId.js": "feat: add request id middleware",
  "backend/src/middleware/requestLogger.js": "feat: add request logging middleware",
  "backend/test/api.test.js": "test: add backend api tests",

  "docs/API.md": "docs: document api reference",
  "docs/ARCHITECTURE.md": "docs: document architecture",
  "docs/DEMO-SCRIPT.md": "docs: add demo script",
  "docs/INNOVATION.md": "docs: describe innovation",
  "docs/PROBLEM-FIT.md": "docs: describe problem fit",
  "docs/adr/0001-postgres-and-express.md": "docs: record adr for postgres and express",
  "docs/adr/0002-openai-tool-calling.md": "docs: record adr for openai tool calling",
  "docs/adr/0003-deterministic-insights.md": "docs: record adr for deterministic insights",
  "docs/judging/RUBRIC.md": "docs: document judging rubric",
  "docs/assets/002-hero.gif": "docs: add hero demonstration gif",
  "docs/assets/003-today.gif": "docs: add today dashboard gif",
  "docs/assets/004-capture.gif": "docs: add goal capture gif",
  "docs/assets/005-execute.gif": "docs: add execution loop gif",
  "docs/assets/006-nudges.gif": "docs: add proactive nudges gif",
  "docs/assets/011-architecture.gif": "docs: add screen-flow architecture gif",
  "docs/assets/012-product-flow.gif": "docs: add animated product flow gif",

  "frontend/.env.example": "chore: add frontend environment template",
  "frontend/package.json": "chore: add frontend package manifest",
  "frontend/index.html": "feat: add frontend entry html",
  "frontend/vite.config.js": "feat: add vite configuration",
  "frontend/wrangler.toml": "feat: add cloudflare pages wrangler config",
  "frontend/playwright.config.mjs": "test: add playwright e2e configuration",
  "frontend/e2e/smoke.spec.js": "test: add smoke e2e tests",
  "frontend/public/favicon.svg": "feat: add favicon",
  "frontend/public/_headers": "feat: add cloudflare pages headers",
  "frontend/public/_redirects": "feat: add cloudflare pages redirects",
  "frontend/src/main.jsx": "feat: add frontend entry",
  "frontend/src/App.jsx": "feat: implement app screens and state routing",
  "frontend/src/index.css": "feat: add app theme and component styles",
  "frontend/src/components/Brand.jsx": "feat: add brand component",
  "frontend/src/components/ErrorBoundary.jsx": "feat: add error boundary component",
  "frontend/src/lib/api.js": "feat: add backend api client",
  "frontend/src/lib/format.js": "feat: add formatting helpers",
  "frontend/src/lib/monitoring.js": "feat: add frontend monitoring",
  "frontend/src/lib/session.js": "feat: add session handling",

  "scripts/dev.mjs": "chore: add concurrent dev runner",
  "scripts/verify.mjs": "ci: add verification runner",
  "scripts/prep-demo.mjs": "chore: add demo seeding script",
  "scripts/demo.json": "chore: add demo data",
  "scripts/capture-gifs.mjs": "chore: add gif capture script",
  "scripts/gifs.json": "chore: track generated gif manifest",
  "scripts/render-diagrams.mjs": "chore: add diagram rendering script",
  "scripts/commit-files.mjs": "chore: add per-file commit helper",
  "scripts/diagrams/architecture.html": "docs: add architecture diagram source",
  "scripts/diagrams/product-flow.html": "docs: add product flow diagram source",
};

const files = execSync('git ls-files --others --exclude-standard', { stdio: ["pipe", "pipe", "pipe"] })
  .toString()
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

let committed = 0;
for (const file of files) {
  const msg = MESSAGES[file] || `feat: add ${file}`;
  execSync(`git add -- "${file}"`, { stdio: "inherit" });
  execSync(`git commit -m "${msg.replace(/\"/g, '\\"')}"`, { stdio: "inherit" });
  committed++;
  console.log(`✓ ${committed}/${files.length}: ${file}`);
}