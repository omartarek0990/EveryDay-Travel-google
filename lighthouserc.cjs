/**
 * Lighthouse CI budgets for the deployed site.
 *
 *   npm run perf -- https://part2-lovat.vercel.app
 *
 * Not part of the build. Mobile profile by default; the three-run median is
 * asserted so a single noisy run does not fail the budget.
 */
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      aggregationMethod: 'median',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.93 }],
        'categories:best-practices': ['warn', { minScore: 1.0 }],
        'categories:seo': ['warn', { minScore: 1.0 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 204800 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
