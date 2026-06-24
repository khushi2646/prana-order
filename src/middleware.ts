import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('prana-session');
  if (session?.value === 'authenticated') {
    return NextResponse.next();
  }
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
