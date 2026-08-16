'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Cek apakah admin
        const { data: prof } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        if (prof?.is_admin) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
    };
    checkSession();
  }, []);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!isValidEmail(email)) {
      setErrorMsg('⚠️ Format email tidak valid.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('⚠️ Password minimal 6 karakter.');
      setLoading(false);
      return;
    }

    let result;

    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        setErrorMsg(`❌ ${result.error.message}`);
        setLoading(false);
        return;
      }
      if (result.data.session) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', result.data.session.user.id)
          .single();
        if (prof?.is_admin) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
    } else {
      result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName || 'Supporter' } }
      });

      if (result.error) {
        if (result.error.message.includes('already registered')) {
          setErrorMsg('❌ Email sudah terdaftar. Silakan login.');
        } else {
          setErrorMsg(`❌ ${result.error.message}`);
        }
        setLoading(false);
        return;
      }

      const { user } = result.data;
      if (user) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            full_name: fullName || 'Supporter',
            tier: 'D',
            loyalty_score: 0,
            is_kyc_verified: false,
            is_community_verified: false,
            community_name: 'None'
          }]);

        if (insertError && insertError.code !== '23505') {
          console.error('Error inserting profile:', insertError);
        }

        alert('✅ Registrasi berhasil! Silakan login.');
        setIsLogin(true);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-red-700 mb-2">⚽ PSS Sleman</h1>
        <p className="text-center text-gray-500 mb-6">Smart Entitlement Prototype</p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Nama Lengkap"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 karakter)"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-red-700 hover:bg-red-800 text-white p-3 rounded-lg font-bold transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : (isLogin ? '🔑 Masuk' : '📝 Daftar')}
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
            className="text-red-700 font-bold hover:underline"
          >
            {isLogin ? 'Daftar Sekarang' : 'Masuk'}
          </button>
        </p>

        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs text-gray-500">
          <p className="font-bold">📋 Info:</p>
          <p>• Admin: bagio1@gmail.com</p>
          <p>• Admin akan langsung masuk ke Dashboard Admin</p>
          <p>• User biasa masuk ke Dashboard User</p>
        </div>
      </div>
    </div>
  );
}
