'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Loading Spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
      <p>Memeriksa akses...</p>
    </div>
  </div>
);

export default function ScanPage() {
  const [scanInput, setScanInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setError(null);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/'); return; }
        
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        if (profError) throw new Error('Gagal memeriksa akses: ' + profError.message);

        if (!prof?.is_admin) {
          alert('⛔ Hanya admin yang dapat mengakses halaman ini.');
          router.push('/dashboard');
        } else {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError(err.message);
      } finally {
        setAuthLoading(false);
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

    try {
      const response = await fetch('/api/tickets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: scanInput.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ error: data.error || 'Gagal validasi' });
      } else {
        setResult({
          success: true,
          message: data.message,
          user: data.user,
          ticket: data.ticket
        });
      }
    } catch (err) {
      setResult({ error: `Error: ${err.message}` });
    }

    setLoading(false);
  };

  if (authLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-red-900/30 rounded-2xl border border-red-500">
          <h2 className="text-2xl font-bold text-red-400 mb-2">😅 Error</h2>
          <p className="text-gray-400">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-purple-400">📷 Validasi QR Tiket</h1>
          <button onClick={() => router.push('/admin')} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition">
            ⬅️ Kembali
          </button>
        </div>

        <div className="bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg">
          <p className="text-gray-400 mb-4">Masukkan kode QR atau token tiket untuk validasi.</p>
          <div className="flex flex-col sm:flex-row gap-4">
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
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold transition disabled:opacity-50 whitespace-nowrap"
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
                    <p>📅 Match: {result.ticket.match_date}</p>
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
              <li>Token bersifat <strong>case sensitive</strong>.</li>
              <li>Setelah divalidasi, status tiket berubah menjadi <span className="text-yellow-300">ISSUED</span>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
