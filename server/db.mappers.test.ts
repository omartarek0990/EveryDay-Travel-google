import { describe, expect, it } from 'vitest';
import { createSeedDatabase, fromDbState, toDbState } from './db.ts';

describe('Supabase state mapping', () => {
  it('round-trips every seeded content table', () => {
    const seed = createSeedDatabase();
    const roundTripped = fromDbState(toDbState(seed));

    expect(roundTripped.siteSettings).toEqual(seed.siteSettings);
    expect(roundTripped.images).toEqual(seed.images);
    expect(roundTripped.heroImages).toEqual(seed.heroImages);
    expect(roundTripped.destinations).toEqual(seed.destinations);
    expect(roundTripped.trips).toEqual(seed.trips);
    expect(roundTripped.tripImages).toEqual(seed.tripImages);
    expect(roundTripped.itineraryDays).toEqual(seed.itineraryDays);
    expect(roundTripped.optionalActivities).toEqual(seed.optionalActivities);
    expect(roundTripped.galleryImages).toEqual(seed.galleryImages);
  });

  it('returns an empty but valid state when Supabase has no settings row', () => {
    const state = fromDbState({});

    expect(state.siteSettings.id).toBe('default');
    expect(state.trips).toEqual([]);
    expect(state.images).toEqual([]);
    expect(state.heroImages).toEqual([]);
  });
});
