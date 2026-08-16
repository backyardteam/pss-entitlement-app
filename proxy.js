import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function proxy(request) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { session } } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/scan');
  const isDashboardPath = path === '/dashboard' || path.startsWith('/tickets');

  if (!session) {
    if (isAdminPath || isDashboardPath || path === '/') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  const isAdmin = profile?.is_admin || false;

  if (isAdmin && (isDashboardPath || path === '/')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (!isAdmin && isAdminPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin', '/admin/:path*', '/dashboard', '/dashboard/:path*', '/tickets', '/scan'],
};
