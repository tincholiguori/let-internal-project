import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const AUTH_COOKIE = 'mosca-session';
const SECRET = process.env.AUTH_SECRET || 'mosca-insights-secret-2026';

function hashToken(value: string): string {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, hash] = token.split('.');
  if (!payload || !hash) return false;
  return hashToken(Buffer.from(payload, 'base64').toString()) === hash;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes — no auth required
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;

  if (!isValidSession(token)) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    // Pages redirect to login
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
