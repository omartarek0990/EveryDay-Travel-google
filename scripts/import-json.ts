import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { saveDb } from '../server/db.ts';
import { createUser, findOwnerByUsername } from '../server/auth.ts';
import type { DatabaseSchema } from '../src/shared/types.ts';

/**
 * One-time helper: pushes the legacy data/db.json content and owner accounts
 * into Supabase. Sessions are intentionally not copied (everyone re-logs in).
 */
async function main() {
  const filePath = path.resolve(process.cwd(), 'data', 'db.json');
  if (!fs.existsSync(filePath)) {
    console.error(`No legacy database found at ${filePath}`);
    process.exit(1);
  }

  const legacy = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DatabaseSchema;
  const { users, sessions: _sessions, loginAttempts: _loginAttempts, ...content } = legacy;

  await saveDb(content);
  console.log(`Imported content: ${content.trips.length} trips, ${content.images.length} images.`);

  for (const user of users) {
    const existing = await findOwnerByUsername(user.username);
    if (existing) {
      console.log(`Owner "${user.username}" already exists — skipped.`);
      continue;
    }
    await createUser({
      username: user.username,
      passwordHash: user.passwordHash,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
    console.log(`Imported owner "${user.username}".`);
  }

  console.log('Import complete. Existing Supabase sessions were left untouched.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
