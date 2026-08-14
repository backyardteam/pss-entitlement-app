'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        await supabase.from('profiles').insert([{
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || 'Supporter',
          tier: 'D',
          loyalty_score: 0
        }]);
        setProfile({ tier: 'D', loyalty_score: 0, is_kyc_verified: false, is_community_verified: false });
      } else {
        setProfile(prof);
      }

      const { data: ruleData } = await supabase
        .from('entitlement_rules')
        .select('*')
        .eq('is_active', true)
        .order('purchase_day', { ascending: true });
      setRules(ruleData || []);
      setLoading(false);
    };

    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleVerifyKYC = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_kyc_verified: true, tier: 'B' })
      .eq('id', session.user.id);
    if (!error) {
      alert('✅ KYC Berhasil! Tier naik ke B.');
      window.location.reload();
    }
  };

  if (loading) return <div className="p-10 text-center">Loading data...</div>;
  if (!profile) return <div className="p-10 text-center">Profil tidak ditemukan</div>;

  const myRule = rules.find(r => r.tier === profile.tier);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-red-700">🏟️ Dashboard PSS</h1>
          <button onClick={handleLogout} className="bg-gray-800 text-white px-4 py-2 rounded-lg">Logout</button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500">Nama</p>
              <p className="font-bold text-xl">{profile.full_name || 'Nama belum diisi'}</p>
              <p className="text-gray-500 mt-2">Tier Saat Ini</p>
              <span className={`text-2xl font-extrabold ${profile.tier === 'A' ? 'text-yellow-500' : profile.tier === 'B' ? 'text-blue-600' : 'text-gray-600'}`}>
                {profile.tier}
              </span>
            </div>
            <div>
              <p className="text-gray-500">Loyalty Score</p>
              <p className="font-bold text-2xl">{profile.loyalty_score}</p>
              <p className="text-gray-500 mt-2">Status KYC</p>
              <p className={`font-bold ${profile.is_kyc_verified ? 'text-green-600' : 'text-red-500'}`}>
                {profile.is_kyc_verified ? '✅ Terverifikasi' : '❌ Belum Verifikasi'}
              </p>
              <p className="text-gray-500">Komunitas</p>
              <p>{profile.is_community_verified ? `✅ ${profile.community_name}` : '❌ Tidak terafiliasi'}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-600 to-green-700 text-white p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-2xl font-bold">🎟️ Hak Beli Tiket (Entitlement)</h2>
          {myRule ? (
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/20 p-4 rounded-xl">
                <p className="text-sm opacity-80">Purchase Window</p>
                <p className="text-3xl font-bold">Hari ke-{myRule.purchase_day}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <p className="text-sm opacity-80">Maksimal Tiket</p>
                <p className="text-3xl font-bold">{myRule.quota} Tiket</p>
              </div>
            </div>
          ) : (
            <p className="mt-2">Aturan untuk tier ini belum diatur oleh admin.</p>
          )}
          <div className="mt-4 text-sm bg-black/20 p-3 rounded-xl">
            <p>📌 <strong>Catatan:</strong> Tier A beli hari 1, Tier B hari 2, dst. Sistem ini mencegah server overload!</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button onClick={handleVerifyKYC} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-xl shadow">
            🔓 Verifikasi KYC (Naik Tier B)
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow">
            📱 Lihat Tiket Saya
          </button>
        </div>

        <div className="mt-8 bg-white p-4 rounded-xl border border-gray-300">
          <h3 className="font-bold">📊 Semua Aturan Purchase Window</h3>
          <div className="grid grid-cols-4 gap-2 mt-2 text-center text-sm">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-gray-100 p-2 rounded">
                <span className="font-bold">Tier {rule.tier}</span>
                <p>Hari {rule.purchase_day}</p>
                <p>Kuota {rule.quota}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
