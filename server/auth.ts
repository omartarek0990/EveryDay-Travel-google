import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import type { SessionRecord, UserRecord, UserRole } from '../src/shared/types.ts';
import { getSupabaseAdmin } from './supabase.ts';

const BCRYPT_COST = 12;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.W0zQ6n4q5R7sT8uV9wX0yZ1aB2cD3e.';

export const SESSION_COOKIE_NAME = '__Host-session';
export const FALLBACK_COOKIE_NAME = 'ed_session';

type DbRow = Record<string, unknown>;

function toUser(row: DbRow): UserRecord {
  return {
    id: String(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    role: (row.role as UserRole) ?? 'OWNER',
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: String(row.created_at),
  };
}

function toSession(row: DbRow): SessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    expiresAt: String(row.expires_at),
    lastRefreshedAt: String(row.last_refreshed_at),
    createdAt: String(row.created_at),
  };
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function runDummyHashCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function getAttemptKey(username: string, ip: string): string {
  return crypto
    .createHash('sha256')
    .update(`${username.toLowerCase().trim()}|${ip}`)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export async function countOwners(): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'OWNER');

  if (error) throw new Error(`Failed to count owners: ${error.message}`);
  return count ?? 0;
}

export async function findOwnerByUsername(username: string): Promise<UserRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase())
    .eq('role', 'OWNER')
    .maybeSingle();

  if (error) throw new Error(`Failed to load user: ${error.message}`);
  return data ? toUser(data) : null;
}

export async function findFirstOwner(): Promise<UserRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .eq('role', 'OWNER')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load owner: ${error.message}`);
  return data ? toUser(data) : null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load user: ${error.message}`);
  return data ? toUser(data) : null;
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  role?: UserRole;
  mustChangePassword?: boolean;
}): Promise<UserRecord> {
  const row = {
    id: crypto.randomUUID(),
    username: input.username.toLowerCase(),
    password_hash: input.passwordHash,
    role: input.role ?? 'OWNER',
    must_change_password: input.mustChangePassword ?? false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .insert(row)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create user: ${error?.message ?? 'unknown error'}`);
  }
  return toUser(data);
}

export async function updateUser(
  id: string,
  patch: { username?: string; passwordHash?: string; mustChangePassword?: boolean }
): Promise<UserRecord> {
  const row: DbRow = {};
  if (patch.username !== undefined) row.username = patch.username.toLowerCase();
  if (patch.passwordHash !== undefined) row.password_hash = patch.passwordHash;
  if (patch.mustChangePassword !== undefined) row.must_change_password = patch.mustChangePassword;

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update user: ${error?.message ?? 'unknown error'}`);
  }
  return toUser(data);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export async function createSessionForUser(
  userId: string
): Promise<{ token: string; expiresAt: string }> {
  const supabase = getSupabaseAdmin();
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();

  // Prune expired sessions before inserting the new one.
  await supabase.from('sessions').delete().lt('expires_at', new Date(now).toISOString());

  const { error } = await supabase.from('sessions').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    last_refreshed_at: new Date(now).toISOString(),
    created_at: new Date(now).toISOString(),
  });

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return { token, expiresAt };
}

export async function findSessionByToken(token: string): Promise<SessionRecord | null> {
  const tokenHash = hashSessionToken(token);
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) throw new Error(`Failed to load session: ${error.message}`);
  return data ? toSession(data) : null;
}

export async function deleteSessionById(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('sessions').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete session: ${error.message}`);
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  const { error } = await getSupabaseAdmin()
    .from('sessions')
    .delete()
    .eq('token_hash', tokenHash);
  if (error) throw new Error(`Failed to delete session: ${error.message}`);
}

export async function deleteOtherSessions(userId: string, keepToken?: string): Promise<void> {
  let query = getSupabaseAdmin().from('sessions').delete().eq('user_id', userId);
  if (keepToken) {
    query = query.neq('token_hash', hashSessionToken(keepToken));
  }
  const { error } = await query;
  if (error) throw new Error(`Failed to delete sessions: ${error.message}`);
}

export async function deleteAllSessions(): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('sessions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`Failed to delete sessions: ${error.message}`);
}

export async function refreshSession(session: SessionRecord): Promise<void> {
  const now = Date.now();
  const { error } = await getSupabaseAdmin()
    .from('sessions')
    .update({
      expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
      last_refreshed_at: new Date(now).toISOString(),
    })
    .eq('id', session.id);

  if (error) throw new Error(`Failed to refresh session: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Login attempts / lockout
// ---------------------------------------------------------------------------
export async function isLoginLocked(username: string, ip: string): Promise<boolean> {
  const key = getAttemptKey(username, ip);
  const cutoff = new Date(Date.now() - LOCKOUT_WINDOW_MS).toISOString();
  const { count, error } = await getSupabaseAdmin()
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', cutoff);

  if (error) throw new Error(`Failed to check login attempts: ${error.message}`);
  return (count ?? 0) >= MAX_LOGIN_FAILURES;
}

export async function recordFailedLogin(username: string, ip: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const key = getAttemptKey(username, ip);
  const cutoff = new Date(Date.now() - LOCKOUT_WINDOW_MS).toISOString();

  await supabase.from('login_attempts').delete().lt('created_at', cutoff);
  const { error } = await supabase.from('login_attempts').insert({
    id: crypto.randomUUID(),
    key,
    created_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Failed to record login attempt: ${error.message}`);
}

export async function clearFailedLogins(username: string, ip: string): Promise<void> {
  const key = getAttemptKey(username, ip);
  const { error } = await getSupabaseAdmin().from('login_attempts').delete().eq('key', key);
  if (error) throw new Error(`Failed to clear login attempts: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Request auth helpers
// ---------------------------------------------------------------------------
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function extractTokenFromRequest(req: Request): {
  token: string | null;
  source: 'bearer' | 'cookie' | null;
} {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const bearer = auth.slice('Bearer '.length).trim();
    if (bearer) return { token: bearer, source: 'bearer' };
  }
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME] || cookies[FALLBACK_COOKIE_NAME] || null;
  if (cookieToken) return { token: cookieToken, source: 'cookie' };
  return { token: null, source: null };
}

function isSecureRequest(req: Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  return req.secure || proto === 'https';
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const secure = isSecureRequest(req);
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  if (secure) {
    // __Host- prefix requires Secure, Path=/, no Domain; SameSite=None; Partitioned supports AI Studio iframe
    const parts = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      `Max-Age=${maxAge}`,
      'HttpOnly',
      'Secure',
      'SameSite=None',
      'Partitioned',
    ];
    res.setHeader('Set-Cookie', parts.join('; '));
  } else {
    const parts = [
      `${FALLBACK_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      `Max-Age=${maxAge}`,
      'HttpOnly',
      'SameSite=Lax',
    ];
    res.setHeader('Set-Cookie', parts.join('; '));
  }
}

export function clearSessionCookie(req: Request, res: Response): void {
  const secure = isSecureRequest(req);
  if (secure) {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `${FALLBACK_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
  }
}

export function verifyMutationOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // Same-origin fetch or non-browser client
  const expectedHost = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  if (!expectedHost) return false;
  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host === expectedHost;
  } catch {
    return false;
  }
}

export interface AuthenticatedRequest extends Request {
  ownerUser?: UserRecord;
  sessionToken?: string;
}

export async function resolveOwnerFromRequest(req: Request): Promise<UserRecord | null> {
  const { token } = extractTokenFromRequest(req);
  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await deleteSessionById(session.id);
    return null;
  }

  const user = await findUserById(session.userId);
  if (!user || user.role !== 'OWNER') return null;
  return user;
}

export async function requireOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, source } = extractTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
      return;
    }

    // CSRF check for cookie-authenticated state-changing requests
    if (source === 'cookie' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!verifyMutationOrigin(req)) {
        res.status(403).json({ error: 'Origin mismatch' });
        return;
      }
    }

    const session = await findSessionByToken(token);
    if (!session) {
      res.status(401).json({ error: 'انتهت الجلسة. يرجى تسجيل الدخول مجدداً.' });
      return;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await deleteSessionById(session.id);
      res.status(401).json({ error: 'انتهت الجلسة. يرجى تسجيل الدخول مجدداً.' });
      return;
    }

    const user = await findUserById(session.userId);
    if (!user || user.role !== 'OWNER') {
      res.status(401).json({ error: 'غير مصرح.' });
      return;
    }

    // Refresh session expiry at most once per 24 hours
    const lastRefreshed = new Date(session.lastRefreshedAt).getTime();
    if (Date.now() - lastRefreshed >= SESSION_REFRESH_INTERVAL_MS) {
      await refreshSession(session);
    }

    req.ownerUser = user;
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}
