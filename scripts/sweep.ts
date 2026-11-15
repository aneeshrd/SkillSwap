/**
 * Releases credits held by sessions that will never resolve.
 * Run hourly in a real deployment:  0 * * * *  npx tsx scripts/sweep.ts
 */
import fs from "node:fs";
import path from "node:path";

for (const file of [".env.local", ".env"]) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

import { settleStaleSessions } from "../src/lib/sweep";

const result = settleStaleSessions();
console.info(
  `Sweep complete: ${result.expiredRequests} unanswered request(s), ` +
    `${result.expiredSessions} unconfirmed session(s), ` +
    `${result.creditsReturned} credit(s) returned.`
);
