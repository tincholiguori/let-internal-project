import { cookies } from 'next/headers';
import crypto from 'crypto';

const AUTH_COOKIE = 'mosca-session';
const SECRET = process.env.AUTH_SECRET || 'mosca-insights-secret-2026';
const USERS: Record<string, string> = {
  [process.env.AUTH_USER || 'admin']: process.env.AUTH_PASS || 'mosca2026',
};

export function hashToken(value: string): string {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

export function createSessionToken(username: string): string {
  const payload = `${username}:${Date.now()}`;
  return Buffer.from(payload).toString('base64') + '.' + hashToken(payload);
}

export function validateCredentials(username: string, password: string): boolean {
  return USERS[username] === password;
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const [payload, hash] = token.split('.');
  if (!payload || !hash) return null;
  if (hashToken(Buffer.from(payload, 'base64').toString()) !== hash) return null;
  const decoded = Buffer.from(payload, 'base64').toString();
  const username = decoded.split(':')[0];
  return username || null;
}

export { AUTH_COOKIE };
