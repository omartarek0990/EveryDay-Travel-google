import 'dotenv/config';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { getDb, saveDb } from '../server/db.ts';
import { hashPassword } from '../server/auth.ts';
import { validatePasswordStrength } from '../src/shared/schemas.ts';

async function main() {
  const args = process.argv.slice(2);
  let username = '';
  let password = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--username' && args[i + 1]) username = args[++i];
    if (args[i] === '--password' && args[i + 1]) password = args[++i];
  }

  const rl = readline.createInterface({ input, output });
  try {
    if (!username) {
      username = await rl.question('Owner username (lowercase letters/numbers): ');
    }
    username = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      console.error('Invalid username. Use 3-32 lowercase letters, numbers, dot, underscore, or dash.');
      process.exit(1);
    }

    if (!password) {
      password = await rl.question('Owner password (min 10 chars): ');
    }
    const pwErr = validatePasswordStrength(password, username);
    if (pwErr) {
      console.error('Weak password:', pwErr);
      process.exit(1);
    }

    const db = getDb();
    if (db.users.some((u) => u.username === username)) {
      console.error(`User "${username}" already exists.`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    db.users.push({
      id: crypto.randomUUID(),
      username,
      passwordHash,
      role: 'OWNER',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    console.log(`Owner account "${username}" created successfully.`);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
