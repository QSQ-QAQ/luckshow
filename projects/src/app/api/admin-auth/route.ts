import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ADMIN_AUTH_COOKIE = 'gallery-admin-auth';
const DEFAULT_PASSCODE = '5201314';

function getExpectedPasscode(): string {
  return process.env.ADMIN_PASSCODE?.trim() || DEFAULT_PASSCODE;
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;
  return NextResponse.json({ authenticated: token === '1' });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { passcode?: string };
  const passcode = String(body.passcode || '').trim();

  if (!passcode || passcode !== getExpectedPasscode()) {
    return NextResponse.json({ ok: false, message: '口令错误' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_AUTH_COOKIE, '1', getCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_AUTH_COOKIE);
  return response;
}
