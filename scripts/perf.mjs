import { spawnSync } from 'node:child_process';

/**
 * `npm run perf -- <url>` → Lighthouse CI with the budgets in lighthouserc.cjs.
 * A tiny wrapper is needed because npm appends the URL as a bare argument and
 * LHCI only accepts `--collect.url=<url>`.
 */
const url = process.argv[2];
if (!url) {
  console.error('usage: npm run perf -- https://<url>');
  process.exit(1);
}

const result = spawnSync('npx', ['lhci', 'autorun', `--collect.url=${url}`], {
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status ?? 1);
