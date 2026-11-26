import 'dotenv/config';
import crypto from 'node:crypto';
import { deleteOtherSessions, findOwnerByUsername, hashPassword, updateUser } from '../server/auth.ts';

async function main() {
  const args = process.argv.slice(2);
  let username = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--username' && args[i + 1]) {
      username = args[++i].trim().toLowerCase();
    }
  }

  if (!username) {
    console.error('Usage: npm run reset-password -- --username <username>');
    process.exit(1);
  }

  const user = await findOwnerByUsername(username);
  if (!user) {
    console.error(`User "${username}" not found.`);
    process.exit(1);
  }

  const tempPassword = `${crypto.randomBytes(9).toString('base64url')}A9!`;
  await updateUser(user.id, {
    passwordHash: await hashPassword(tempPassword),
    mustChangePassword: true,
  });
  await deleteOtherSessions(user.id);

  console.log(`Password reset for "${username}".`);
  console.log(`Temporary password (shown once, must be changed at next login): ${tempPassword}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
