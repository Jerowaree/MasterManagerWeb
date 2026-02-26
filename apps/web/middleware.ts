import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPrefix = '/dashboard';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(protectedPrefix)) {
    return NextResponse.next();
  }

  const hasAccessCookie = Boolean(request.cookies.get('access_token')?.value);
  if (hasAccessCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
