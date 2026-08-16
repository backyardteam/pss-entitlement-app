import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { session } } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/scan');
  const isDashboardPath = path === '/dashboard' || path.startsWith('/tickets');

  // Jika tidak login dan mencoba akses halaman terproteksi
  if (!session) {
    if (isAdminPath || isDashboardPath || path === '/') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Cek role user
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  const isAdmin = profile?.is_admin || false;

  // ADMIN mencoba akses halaman supporter → redirect ke /admin
  if (isAdmin && (isDashboardPath || path === '/')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // SUPPORTER mencoba akses halaman admin → redirect ke /dashboard
  if (!isAdmin && isAdminPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin', '/admin/:path*', '/dashboard', '/dashboard/:path*', '/tickets', '/scan'],
};
