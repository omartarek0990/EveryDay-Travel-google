import 'dotenv/config';
import { resetDbToSeed } from '../server/db.ts';

resetDbToSeed();
console.log('Database seeded with default everyDay Travel Agency copy, destinations, 3 trips, and gallery photos.');
