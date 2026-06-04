import { NextRequest, NextResponse } from 'next/server';

var isDev = process.env.NODE_ENV !== 'production';
var gatewayUrl = process.env.GATEWAY_URL || (isDev ? 'http://localhost:3000' : 'http://gateway:3000');
var apiUrl = process.env.API_URL || (isDev ? 'http://localhost:4000' : 'http://api:4000');

var pageRoutes = new Set([
  '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password',
]);

export function middleware(request: NextRequest) {
  var { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/auth/') && !(request.method === 'GET' && pageRoutes.has(pathname))) {
    return NextResponse.rewrite(new URL(pathname + search, gatewayUrl));
  }

  if (pathname === '/graphql') {
    return NextResponse.rewrite(new URL(pathname + search, apiUrl));
  }

  return NextResponse.next();
}

export var config = {
  matcher: ['/auth/:path*', '/graphql'],
};
