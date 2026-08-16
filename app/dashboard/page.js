'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-700 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Error Component
const ErrorDisplay = ({ message, onRetry }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center max-w-md p-8 bg-red-50 rounded-2xl">
      <div className="text-5xl mb-4">😅</div>
      <h2 className="text-2xl font-bold text-red-700 mb-2">Oops!</h2>
      <p className="text-gray-600 mb-4">{message || 'Terjadi kesalahan. Silakan coba lagi.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition">
          Coba Lagi
        </button>
      )}
    </div>
  </div>
);

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [rules, setRules] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyMsg, setBuyMsg] = useState('');
  const [showQR, setShowQR] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      let { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profError && profError.code === 'PGRST116') {
        // Profile not found, create one
        const { data: newProf, error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || 'Supporter',
            tier: 'D',
            loyalty_score: 0
          }])
          .select()
          .single();

        if (insertError) {
          throw new Error('Gagal membuat profil: ' + insertError.message);
        }
        prof = newProf;
      } else if (profError) {
        throw new Error('Gagal mengambil profil: ' + profError.message);
      }

      setProfile(prof);

      const { data: ruleData, error: ruleError } = await supabase
        .from('entitlement_rules')
        .select('*')
        .eq('is_active', true)
        .order('purchase_day', { ascending: true });

      if (ruleError) throw new Error('Gagal mengambil aturan: ' + ruleError.message);
      setRules(ruleData || []);

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (ticketError) throw new Error('Gagal mengambil tiket: ' + ticketError.message);
      setTickets(ticketData || []);

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBuyTicket = async () => {
    setBuyMsg('');
    setBuyLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Silakan login ulang.');

      const response = await fetch('/api/tickets/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal membeli tiket');
      }

      setBuyMsg(`✅ ${result.message}`);
      setTickets([result.ticket, ...tickets]);
      setShowQR(result.ticket.id);

    } catch (error) {
      setBuyMsg(`❌ ${error.message}`);
      console.error('Buy error:', error);
    } finally {
      setBuyLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleVerifyKYC = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Silakan login ulang.');

      const { error } = await supabase
        .from('profiles')
        .update({ is_kyc_verified: true, tier: 'B' })
        .eq('id', session.user.id);

      if (error) throw new Error(error.message);

      alert('✅ KYC Berhasil! Tier naik ke B.');
      await fetchData();

    } catch (error) {
      alert(`❌ ${error.message}`);
    }
  };

  const toggleQR = (ticketId) => {
    setShowQR(showQR === ticketId ? null : ticketId);
  };

  // Loading state
  if (loading) return <LoadingSpinner />;

  // Error state
  if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;

  if (!profile) return <ErrorDisplay message="Profil tidak ditemukan" onRetry={fetchData} />;

  const myRule = rules.find(r => r.tier === profile.tier);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-red-700">🏟️ Dashboard PSS</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => router.push('/tickets')} className="bg-blue-600 text-white px-3 py-2 md:px-4 rounded-lg text-sm md:text-base hover:bg-blue-700 transition">
              🎫 Tiket
            </button>
            <button onClick={handleLogout} className="bg-gray-800 text-white px-3 py-2 md:px-4 rounded-lg text-sm md:text-base hover:bg-gray-900 transition">
              Logout
            </button>
          </div>
        </div>

        {/* PROFIL */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Nama</p>
              <p className="font-bold text-xl">{profile.full_name}</p>
              <p className="text-gray-500 text-sm mt-2">Tier Saat Ini</p>
              <span className={`text-2xl font-extrabold ${profile.tier === 'A' ? 'text-yellow-500' : profile.tier === 'B' ? 'text-blue-600' : 'text-gray-600'}`}>
                {profile.tier}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Loyalty Score</p>
              <p className="font-bold text-2xl">{profile.loyalty_score}</p>
              <p className="text-gray-500 text-sm mt-2">KYC</p>
              <p className={`font-bold ${profile.is_kyc_verified ? 'text-green-600' : 'text-red-500'}`}>
                {profile.is_kyc_verified ? '✅ Terverifikasi' : '❌ Belum'}
              </p>
              <p className="text-gray-500 text-sm">Komunitas</p>
              <p>{profile.is_community_verified ? `✅ ${profile.community_name}` : '❌ Tidak terafiliasi'}</p>
            </div>
          </div>
        </div>

        {/* ENTITLEMENT */}
        <div className="bg-gradient-to-r from-red-600 to-green-700 text-white p-4 md:p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-xl md:text-2xl font-bold">🎟️ Hak Beli Tiket</h2>
          {myRule ? (
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/20 p-4 rounded-xl">
                <p className="text-sm opacity-80">Purchase Window</p>
                <p className="text-2xl md:text-3xl font-bold">Hari ke-{myRule.purchase_day}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <p className="text-sm opacity-80">Maksimal Tiket</p>
                <p className="text-2xl md:text-3xl font-bold">{myRule.quota} Tiket</p>
              </div>
            </div>
          ) : <p>Aturan belum diatur.</p>}
          <p className="mt-3 text-sm bg-black/20 p-2 rounded">📌 Tier A=Hari1, B=Hari2, C=Hari3, D=Hari4</p>
        </div>

        {/* BUY TICKET */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg mb-6">
          <h3 className="text-lg md:text-xl font-bold mb-2">📦 Simulasi Pembelian Tiket</h3>
          <p className="text-sm text-gray-500 mb-3">Klik tombol di bawah untuk memesan tiket. QR Code dan email konfirmasi akan otomatis dibuat.</p>
          <button
            onClick={handleBuyTicket}
            disabled={buyLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow transition disabled:opacity-50 w-full md:w-auto"
          >
            {buyLoading ? '⏳ Memproses...' : '✅ Beli Tiket Sekarang'}
          </button>
          {buyMsg && <p className={`mt-3 font-bold ${buyMsg.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>{buyMsg}</p>}
        </div>

        {/* TICKETS LIST */}
        {tickets.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg mb-6">
            <h3 className="text-lg md:text-xl font-bold mb-4">🎫 Tiket Saya ({tickets.length})</h3>
            <div className="space-y-4">
              {tickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <p className="font-bold">Match: {ticket.match_date}</p>
                      <p className="text-sm text-gray-500">Status: <span className={`font-bold ${ticket.status === 'PAID' ? 'text-green-600' : ticket.status === 'ISSUED' ? 'text-blue-600' : 'text-yellow-600'}`}>{ticket.status}</span></p>
                      {ticket.qr_token && (
                        <p className="text-xs text-gray-400 font-mono break-all">Token: {ticket.qr_token.substring(0, 30)}...</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleQR(ticket.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition"
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
              {tickets.length > 5 && (
                <p className="text-sm text-gray-400 text-center">+{tickets.length - 5} tiket lainnya. <button onClick={() => router.push('/tickets')} className="text-blue-600 hover:underline">Lihat semua</button></p>
              )}
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button onClick={handleVerifyKYC} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-xl shadow transition">
            🔓 Simulasi KYC (Naik Tier B)
          </button>
          <button onClick={() => router.push('/tickets')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow transition">
            📱 Lihat Semua Tiket
          </button>
        </div>

        {/* RULES */}
        <div className="bg-white p-4 rounded-xl border border-gray-300">
          <h3 className="font-bold">📊 Semua Aturan Purchase Window</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-center text-sm">
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
