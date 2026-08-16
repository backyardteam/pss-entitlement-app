'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [rules, setRules] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyMsg, setBuyMsg] = useState('');
  const [showQR, setShowQR] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      let { data: prof, error } = await supabase
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
        prof = { tier: 'D', loyalty_score: 0, is_kyc_verified: false, is_community_verified: false };
      }
      setProfile(prof);

      const { data: ruleData } = await supabase
        .from('entitlement_rules')
        .select('*')
        .eq('is_active', true)
        .order('purchase_day', { ascending: true });
      setRules(ruleData || []);

      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setTickets(ticketData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleBuyTicket = async () => {
    setBuyMsg('');
    setBuyLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setBuyMsg('❌ Session expired'); setBuyLoading(false); return; }

    try {
      // Panggil API Route untuk beli tiket (server-side)
      const response = await fetch('/api/tickets/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });

      const result = await response.json();

      if (!response.ok) {
        setBuyMsg(`❌ Gagal: ${result.error}`);
      } else {
        setBuyMsg(`✅ ${result.message}`);
        setTickets([...tickets, result.ticket]);
        setShowQR(result.ticket.id);
      }
    } catch (error) {
      setBuyMsg(`❌ Error: ${error.message}`);
    }

    setBuyLoading(false);
  };

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

  const toggleQR = (ticketId) => {
    setShowQR(showQR === ticketId ? null : ticketId);
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!profile) return <div className="p-10 text-center">Profil tidak ditemukan</div>;

  const myRule = rules.find(r => r.tier === profile.tier);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-red-700">🏟️ Dashboard PSS</h1>
          <div>
            <button onClick={() => router.push('/tickets')} className="bg-blue-600 text-white px-4 py-2 rounded-lg mr-2">🎫 Tiket</button>
            <button onClick={handleLogout} className="bg-gray-800 text-white px-4 py-2 rounded-lg">Logout</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500">Nama</p>
              <p className="font-bold text-xl">{profile.full_name}</p>
              <p className="text-gray-500 mt-2">Tier Saat Ini</p>
              <span className={`text-2xl font-extrabold ${profile.tier === 'A' ? 'text-yellow-500' : profile.tier === 'B' ? 'text-blue-600' : 'text-gray-600'}`}>
                {profile.tier}
              </span>
            </div>
            <div>
              <p className="text-gray-500">Loyalty Score</p>
              <p className="font-bold text-2xl">{profile.loyalty_score}</p>
              <p className="text-gray-500 mt-2">KYC</p>
              <p className={`font-bold ${profile.is_kyc_verified ? 'text-green-600' : 'text-red-500'}`}>
                {profile.is_kyc_verified ? '✅ Terverifikasi' : '❌ Belum'}
              </p>
              <p className="text-gray-500">Komunitas</p>
              <p>{profile.is_community_verified ? `✅ ${profile.community_name}` : '❌ Tidak terafiliasi'}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-600 to-green-700 text-white p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-2xl font-bold">🎟️ Hak Beli Tiket</h2>
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
          ) : <p>Aturan belum diatur.</p>}
          <p className="mt-3 text-sm bg-black/20 p-2 rounded">📌 Tier A=Hari1, B=Hari2, C=Hari3, D=Hari4</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
          <h3 className="text-xl font-bold mb-2">📦 Simulasi Pembelian Tiket</h3>
          <p className="text-sm text-gray-500 mb-3">Klik tombol di bawah untuk memesan tiket. QR Code akan otomatis dibuat.</p>
          <button
            onClick={handleBuyTicket}
            disabled={buyLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow transition disabled:opacity-50"
          >
            {buyLoading ? '⏳ Memproses...' : '✅ Beli Tiket Sekarang'}
          </button>
          {buyMsg && <p className={`mt-3 font-bold ${buyMsg.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>{buyMsg}</p>}
        </div>

        {tickets.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
            <h3 className="text-xl font-bold mb-4">🎫 Tiket Saya ({tickets.length})</h3>
            <div className="space-y-4">
              {tickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold">Match: {ticket.match_date}</p>
                      <p className="text-sm text-gray-500">Status: <span className={`font-bold ${ticket.status === 'PAID' ? 'text-green-600' : ticket.status === 'ISSUED' ? 'text-blue-600' : 'text-yellow-600'}`}>{ticket.status}</span></p>
                    </div>
                    <button
                      onClick={() => toggleQR(ticket.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      {showQR === ticket.id ? 'Sembunyikan QR' : 'Tampilkan QR'}
                    </button>
                  </div>
                  {showQR === ticket.id && ticket.qr_token && (
                    <div className="mt-4 flex justify-center">
                      <QRCodeCanvas value={ticket.qr_token} size={150} bgColor="#ffffff" fgColor="#000000" level="H" />
                    </div>
                  )}
                </div>
              ))}
              {tickets.length > 5 && <p className="text-sm text-gray-400">+{tickets.length - 5} tiket lainnya.</p>}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-6">
          <button onClick={handleVerifyKYC} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-xl shadow">
            🔓 Simulasi KYC (Naik Tier B)
          </button>
          <button onClick={() => router.push('/tickets')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow">
            📱 Lihat Semua Tiket
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-300">
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
