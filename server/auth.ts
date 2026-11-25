import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import { getDb, saveDb } from './db.ts';
import type { UserRecord } from '../src/shared/types.ts';

const BCRYPT_COST = 12;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.W0zQ6n4q5R7sT8uV9wX0yZ1aB2cD3e.';

export const SESSION_COOKIE_NAME = '__Host-session';
export const FALLBACK_COOKIE_NAME = 'ed_session';

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

export function isLoginLocked(username: string, ip: string): boolean {
  const db = getDb();
  const key = getAttemptKey(username, ip);
  const cutoff = Date.now() - LOCKOUT_WINDOW_MS;
  const recentFailures = db.loginAttempts.filter(
    (a) => a.key === key && new Date(a.createdAt).getTime() >= cutoff
  );
  return recentFailures.length >= MAX_LOGIN_FAILURES;
}

export function recordFailedLogin(username: string, ip: string): void {
  const db = getDb();
  const key = getAttemptKey(username, ip);
  const cutoff = Date.now() - LOCKOUT_WINDOW_MS;
  db.loginAttempts = db.loginAttempts.filter(
    (a) => new Date(a.createdAt).getTime() >= cutoff
  );
  db.loginAttempts.push({
    id: crypto.randomUUID(),
    key,
    createdAt: new Date().toISOString(),
  });
  saveDb(db);
}

export function clearFailedLogins(username: string, ip: string): void {
  const db = getDb();
  const key = getAttemptKey(username, ip);
  db.loginAttempts = db.loginAttempts.filter((a) => a.key !== key);
  saveDb(db);
}

export function createSessionForUser(userId: string): { token: string; expiresAt: string } {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();

  // Prune expired sessions
  db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  db.sessions.push({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    lastRefreshedAt: new Date(now).toISOString(),
    createdAt: new Date(now).toISOString(),
  });
  saveDb(db);

  return { token, expiresAt };
}

export function deleteSessionByToken(token: string): void {
  const db = getDb();
  const tokenHash = hashSessionToken(token);
  db.sessions = db.sessions.filter((s) => s.tokenHash !== tokenHash);
  saveDb(db);
}

export function deleteOtherSessions(userId: string, keepToken?: string): void {
  const db = getDb();
  const keepHash = keepToken ? hashSessionToken(keepToken) : null;
  db.sessions = db.sessions.filter(
    (s) => s.userId !== userId || (keepHash !== null && s.tokenHash === keepHash)
  );
  saveDb(db);
}

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

export function requireOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
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

  const db = getDb();
  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  const session = db.sessions.find((s) => s.tokenHash === tokenHash);

  if (!session || new Date(session.expiresAt).getTime() <= now) {
    if (session) {
      db.sessions = db.sessions.filter((s) => s.id !== session.id);
      saveDb(db);
    }
    res.status(401).json({ error: 'انتهت الجلسة. يرجى تسجيل الدخول مجدداً.' });
    return;
  }

  const user = db.users.find((u) => u.id === session.userId && u.role === 'OWNER');
  if (!user) {
    res.status(401).json({ error: 'غير مصرح.' });
    return;
  }

  // Refresh session expiry at most once per 24 hours
  const lastRefreshed = new Date(session.lastRefreshedAt).getTime();
  if (now - lastRefreshed >= SESSION_REFRESH_INTERVAL_MS) {
    session.expiresAt = new Date(now + SESSION_TTL_MS).toISOString();
    session.lastRefreshedAt = new Date(now).toISOString();
    saveDb(db);
  }

  req.ownerUser = user;
  req.sessionToken = token;
  next();
}
