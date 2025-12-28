import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDocuments = req.nextUrl.pathname.startsWith('/documents');

  if (isOnDocuments && !isLoggedIn) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/documents/:path*'],
  // Note: /view/:path* is intentionally NOT included here to allow public access
};
