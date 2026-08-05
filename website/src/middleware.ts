import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/portal'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get('avn_session')?.value;
  if (!token) {
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*'],
};
