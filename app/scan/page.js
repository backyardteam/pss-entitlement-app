'use client';

import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const [scanInput, setScanInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: prof } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      if (!prof?.is_admin) {
        alert('⛔ Hanya admin yang dapat mengakses halaman ini.');
        router.push('/dashboard');
      } else {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  const handleScan = async () => {
    if (!scanInput.trim()) {
      setResult({ error: 'Masukkan kode QR atau token tiket.' });
      return;
    }

    setLoading(true);
    setResult(null);
    const token = scanInput.trim();
    console.log('🔍 Mencari token:', token);

    // 1. Cari tiket berdasarkan qr_token
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('qr_token', token)
      .maybeSingle();

    if (error) {
      console.error('Error query:', error);
      setResult({ error: `❌ Error query: ${error.message}` });
      setLoading(false);
      return;
    }

    if (!ticket) {
      setResult({ error: '❌ Tiket tidak ditemukan. Pastikan token yang dimasukkan benar (case sensitive).' });
      setLoading(false);
      return;
    }

    // 2. Ambil nama user dari profiles berdasarkan user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ticket.user_id)
      .maybeSingle();

    let userName = 'Unknown';
    if (profileError) {
      console.error('Error fetching profile:', profileError);
    } else if (profile) {
      userName = profile.full_name;
    }

    // 3. Cek status
    if (ticket.status === 'ISSUED') {
      setResult({ error: '⚠️ Tiket ini sudah digunakan (status ISSUED).' });
      setLoading(false);
      return;
    }

    // 4. Update status menjadi ISSUED
    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'ISSUED' })
      .eq('id', ticket.id);

    if (updateError) {
      setResult({ error: `❌ Gagal update: ${updateError.message}` });
    } else {
      setResult({
        success: true,
        ticket: ticket,
        message: `✅ Tiket berhasil divalidasi!`,
        user: userName,
        matchDate: ticket.match_date
      });
    }

    setLoading(false);
  };

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
        <p>Memeriksa akses...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-purple-400">📷 Validasi QR Tiket</h1>
          <button onClick={() => router.push('/admin')} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition">⬅️ Kembali</button>
        </div>

        <div className="bg-gray-800 p-8 rounded-2xl shadow-lg">
          <p className="text-gray-400 mb-4">Masukkan kode QR atau token tiket untuk validasi.</p>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Scan QR atau ketik token..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="flex-1 bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
            <button
              onClick={handleScan}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold transition disabled:opacity-50"
            >
              {loading ? '⏳' : '🔍 Validasi'}
            </button>
          </div>

          {result && (
            <div className={`mt-6 p-4 rounded-xl ${result.error ? 'bg-red-900/50 border border-red-500' : 'bg-green-900/50 border border-green-500'}`}>
              {result.error ? (
                <p className="text-red-300">{result.error}</p>
              ) : (
                <>
                  <p className="text-green-300 font-bold">{result.message}</p>
                  <div className="mt-2 text-sm text-gray-300 space-y-1">
                    <p>👤 Pemilik: {result.user}</p>
                    <p>🎟️ ID Tiket: {result.ticket.id}</p>
                    <p>📅 Match: {result.matchDate}</p>
                    <p>📌 Status sekarang: <span className="text-yellow-300 font-bold">ISSUED</span></p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-700/50 rounded-lg text-sm text-gray-400">
            <p>💡 <strong>Tips:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Copy-paste token QR dari halaman tiket di dashboard.</li>
              <li>Token bersifat <strong>case sensitive</strong> (huruf besar/kecil berpengaruh).</li>
              <li>Setelah divalidasi, status tiket berubah menjadi <span className="text-yellow-300">ISSUED</span>.</li>
              <li>Tiket yang sudah ISSUED tidak bisa divalidasi ulang.</li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500 rounded text-xs text-gray-400">
            <p>🔍 Debug: Pastikan token yang dimasukkan persis dengan yang ada di database.</p>
            <p className="mt-1">Cek token di Supabase: SELECT id, qr_token FROM tickets;</p>
          </div>
        </div>
      </div>
    </div>
  );
}
