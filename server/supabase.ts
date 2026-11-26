import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export const DEFAULT_STORAGE_BUCKET = 'site-images';

/** Upper bound for every Supabase round-trip originating from the function. */
export const SUPABASE_TIMEOUT_MS = 8000;

export function supabaseAbortSignal(): AbortSignal {
  return AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
}

/** For client calls that do not accept an AbortSignal (storage API). */
export async function withSupabaseTimeout<T>(
  promise: Promise<T>,
  label = 'Supabase',
  ms = SUPABASE_TIMEOUT_MS
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function getSupabaseUrl(): string | null {
  const url = process.env.SUPABASE_URL?.trim();
  if (!url) return null;
  // Accept both the project URL and the REST endpoint copied from the dashboard.
  return url.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

export function getSupabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.'
    );
  }

  if (!client) {
    client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'x-application-name': 'everyday-travel' },
      },
    });
  }

  return client;
}

export function getStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET;
}
