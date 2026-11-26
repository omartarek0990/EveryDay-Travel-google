import 'dotenv/config';
import { resetDbToSeed } from '../server/db.ts';

async function main() {
  await resetDbToSeed();
  console.log(
    'Database seeded with default everyDay Travel Agency copy, destinations, 3 trips, and gallery photos.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
