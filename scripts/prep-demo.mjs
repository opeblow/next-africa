import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", "backend", ".env"), override: true });

const { default: bcrypt } = await import("bcrypt");
const { pool, query } = await import("../backend/src/db/pool.js");

const email = "demo.gif@next.local";
const named = `${(process.argv[2] || "Demo").trim()}`;
const plain = "demo-gif-password-2026";
const hash = await bcrypt.hash(plain, 12);

const { rows: existingRows } = await query("SELECT id, name, email, created_at FROM users WHERE email = $1", [email]);
const existing = existingRows[0];
let user = existing;
if (!user) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, proactivity_level)
     VALUES ($1, $2, $3, 'active')
     RETURNING id, name, email, created_at`,
    [named, email, hash]
  );
  user = rows[0];
} else {
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, user.id]);
}

const now = new Date();
const iso = (days, hours = 0, mins = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hours, mins, 0, 0);
  return d.toISOString();
};

const seed = [
  { type: "task", title: "Send the client proposal to Mr. Okonwo", due_date: iso(0, 13, 0), status: "open", linked: null, raw: "send the client proposal before Thursday at 13:00" },
  { type: "task", title: "Confirm the venue for the weekend launch", due_date: iso(0, 15, 0), status: "open", linked: null, raw: "confirm the venue for the launch by 15:00" },
  { type: "meeting", title: "Call Amina about the invoice", due_date: iso(0, 18, 0), status: "open", linked: null, raw: "call Amina about the invoice this evening" },
  { type: "task", title: "Repost festival flyer in the PG WhatsApp group", due_date: iso(1, 9, 0), status: "open", linked: null, raw: "repost the festival flyer in the group tomorrow morning" },
  { type: "task", title: "Pick up the custom T-shirts from Computer Village", due_date: iso(1, 16, 0), status: "open", linked: null, raw: "pick up the T-shirts from Computer Village" },
  { type: "task", title: "Follow up with Wema Bank on POS refund", due_date: iso(2, 10, 0), status: "open", linked: null, raw: "follow up on the POS refund" },
  { type: "task", title: "Waiting on dispatch confirmation from GIG Logistics", due_date: null, status: "waiting", linked: null, raw: "waiting on dispatch confirmation from GIG Logistics" },
  { type: "task", title: "Waiting for the final artwork from the designer", due_date: null, status: "waiting", linked: null, raw: "waiting for the final artwork from the designer" },
];

const ids = [];
for (const item of seed) {
  const { rows } = await query(
    `INSERT INTO commitments (user_id, type, title, due_date, status, raw_input)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [user.id, item.type, item.title, item.due_date, item.status, item.raw]
  );
  ids.push(rows[0].id);
}

const projectRoot = ids[0];
await query(`UPDATE commitments SET linked_commitment_id = $1 WHERE id = $2`, [projectRoot, ids[1]]);
await query(`UPDATE commitments SET linked_commitment_id = $1 WHERE id = $2`, [projectRoot, ids[2]]);

await query(`DELETE FROM nudges WHERE user_id = $1`, [user.id]);

console.log(JSON.stringify({ id: user.id, name: user.name, email, password: plain, seededCommitments: seed.length }));
await pool.end();