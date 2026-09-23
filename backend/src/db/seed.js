import bcrypt from "bcrypt";
import { pathToFileURL } from "node:url";
import { pool } from "./pool.js";

const SEED_EMAIL = process.env.SEED_EMAIL || "demo@next.africa";
const SEED_PASSWORD = process.env.SEED_PASSWORD || "nextdemo123";
const SEED_NAME = process.env.SEED_NAME || "Demo Founder";

/** Returns an ISO timestamp relative to now (hours forward = positive). */
function at(hoursFromNow = 0) {
  return new Date(Date.now() + hoursFromNow * 3600e3).toISOString();
}

/**
 * Creates (or refreshes) a demo account with a realistic story: a linked
 * project chain, a time conflict the nudges will flag, a waiting item, and a
 * couple of loose commitments. Idempotent — re-running resets the data.
 */
export async function seedDemo() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM users WHERE email = $1", [SEED_EMAIL]);
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (name, email, password_hash, proactivity_level)
       VALUES ($1, $2, $3, 'active') RETURNING id`,
      [SEED_NAME, SEED_EMAIL, passwordHash]
    );
    const uid = user.id;

    const commit = async (title, type, { due = null, status = "open", createdDaysAgo = 0, linked = null } = {}) => {
      const { rows: [row] } = await client.query(
        `INSERT INTO commitments (user_id, raw_input, type, title, due_date, status, linked_commitment_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [uid, title, type, title, due, status, linked, at(-createdDaysAgo * 24)]
      );
      return row.id;
    };

    // Project 1 — the proposal story from the demo script.
    const proposal = await commit("Prepare proposal for Tunde", "task", { due: at(48), createdDaysAgo: 3 });
    await commit("Send proposal to Tunde", "deadline", { due: at(36), linked: proposal, createdDaysAgo: 2 });
    await commit("Confirm venue for Monday's meeting", "meeting", { due: at(30), createdDaysAgo: 1 });
    await commit("Review Tunde's feedback email", "task", { status: "done", linked: proposal, createdDaysAgo: 1 });

    // Project 2 — a second chain with different progress.
    const licence = await commit("Renew trading licence", "task", { due: at(72), createdDaysAgo: 6 });
    await commit("Collect licence at council", "task", { status: "done", linked: licence, createdDaysAgo: 5 });

    // A time conflict the nudges flag (two meetings one hour apart).
    const kickoff = await commit("Client kickoff call", "meeting", { due: at(26), createdDaysAgo: 2 });
    await commit("Design review sync", "meeting", { due: at(27), createdDaysAgo: 2 });
    await client.query(
      `INSERT INTO nudges (user_id, type, message, commitment_id, source_key, status)
       VALUES ($1, 'conflict', $2, $3, $4, 'open')`,
      [
        uid,
        "Design review sync overlaps within 2 hours of Client kickoff call — move one to avoid a clash.",
        kickoff,
        "seed-conflict-kickoff",
      ]
    );

    // Waiting + loose items (computed due/waiting nudges will appear).
    await commit("Follow up with Lagos office on invoice", "task", { status: "waiting", createdDaysAgo: 5 });
    await commit("Call Mama about Saturday visit", "reminder", { due: at(8), createdDaysAgo: 1 });
    await commit("Pay school fees before term", "deadline", { due: at(40), createdDaysAgo: 4 });

    const { rows: [counts] } = await client.query(
      `SELECT
         (SELECT count(*) FROM commitments WHERE user_id = $1) AS commitments,
         (SELECT count(*) FROM nudges WHERE user_id = $1) AS nudges`,
      [uid]
    );

    await client.query("COMMIT");
    return { userId: uid, email: SEED_EMAIL, password: SEED_PASSWORD, counts };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    const result = await seedDemo();
    console.log("[db] seeded demo account");
    console.log(`  email:    ${result.email}`);
    console.log(`  password: ${result.password}`);
    console.log(`  proactivity: active    commitments: ${result.counts.commitments}    nudges: ${result.counts.nudges}`);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error(`[db] ${error.message}`);
    process.exit(1);
  }
}