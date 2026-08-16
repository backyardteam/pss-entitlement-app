'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: prof } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(prof?.is_admin || false);
      }
      setLoading(false);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setIsAdmin(data?.is_admin || false));
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <nav className="bg-gray-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-xl text-red-500 ml-2">PSS</span>
          <span className="text-gray-400 ml-1 hidden sm:inline">Sleman</span>
        </div>
      </nav>
    );
  }

  // Menu untuk SUPPORTER
  const supporterMenus = [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Tiket Saya', href: '/tickets', icon: '🎫' },
  ];

  // Menu untuk ADMIN
  const adminMenus = [
    { label: 'Dashboard Admin', href: '/admin', icon: '👑' },
    { label: 'Scan QR', href: '/scan', icon: '📷' },
    { label: 'Manajemen User', href: '/admin#users', icon: '👥' },
    { label: 'Aturan Tiket', href: '/admin#rules', icon: '⚙️' },
  ];

  const menus = isAdmin ? adminMenus : supporterMenus;
  const homeLink = isAdmin ? '/admin' : '/dashboard';

  const isActive = (href) => {
    if (href.includes('#')) {
      return pathname === href.split('#')[0];
    }
    return pathname === href;
  };

  return (
    <nav className="bg-gray-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={homeLink} className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="font-bold text-xl text-red-500">PSS</span>
            <span className="text-gray-400 hidden sm:inline">Sleman</span>
            {isAdmin && (
              <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">
                ADMIN
              </span>
            )}
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {menus.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-red-700 text-white'
                    : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={handleLogout}
                className="ml-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 transition"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {menus.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-red-700 text-white'
                    : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon} {item.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 transition"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
